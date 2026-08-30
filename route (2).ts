import { NextResponse } from 'next/server'

/**
 * POST /api/ai/assistant
 *
 * Endpoint servidor para el asistente de IA.
 *
 * Arquitectura:
 *
 * Client
 *   ↓
 * POST /api/ai/assistant
 *   ↓
 * Validación / seguridad
 *   ↓
 * Gemini API
 *   ↓
 * Respuesta normalizada
 *
 * Principios:
 *
 * - La API key NUNCA se obtiene desde NEXT_PUBLIC_*.
 * - La clave permanece exclusivamente en el servidor.
 * - El mensaje recibido se considera NO CONFIABLE.
 * - Se limita el tamaño del payload.
 * - Se controla el tamaño del mensaje.
 * - Se valida Content-Type.
 * - Se controlan respuestas HTTP de Gemini.
 * - No se exponen errores internos al cliente.
 * - Cada solicitud obtiene un requestId.
 * - Se evita devolver estructuras internas del proveedor.
 *
 * Requisitos:
 *
 * GEMINI_API_KEY=...
 *
 * Opcional:
 *
 * GEMINI_MODEL=gemini-2.5-flash
 */

export const runtime = 'nodejs'

export const dynamic = 'force-dynamic'

export const maxDuration = 30

const DEFAULT_MODEL =
  process.env.GEMINI_MODEL || 'gemini-2.5-flash'

const GEMINI_API_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models'

const MAX_BODY_SIZE = 32_768
const MAX_MESSAGE_LENGTH = 8_000

const REQUEST_TIMEOUT_MS = 20_000

interface AssistantRequestBody {
  message?: unknown
}

interface GeminiPart {
  text?: unknown
}

interface GeminiContent {
  parts?: GeminiPart[]
}

interface GeminiCandidate {
  content?: GeminiContent
  finishReason?: string
}

interface GeminiResponse {
  candidates?: GeminiCandidate[]
  promptFeedback?: {
    blockReason?: string
  }
  error?: {
    code?: number
    message?: string
    status?: string
  }
}

function jsonError(
  message: string,
  status: number,
  code?: string,
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(code ? { code } : {}),
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}

function normalizeMessage(
  value: unknown,
): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const message = value
    .replace(/\u0000/g, '')
    .trim()

  if (!message) {
    return null
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return null
  }

  return message
}

function extractGeminiReply(
  data: GeminiResponse,
): string | null {
  const candidates = data.candidates

  if (!Array.isArray(candidates)) {
    return null
  }

  for (const candidate of candidates) {
    const parts = candidate.content?.parts

    if (!Array.isArray(parts)) {
      continue
    }

    const text = parts
      .map((part) =>
        typeof part.text === 'string'
          ? part.text.trim()
          : '',
      )
      .filter(Boolean)
      .join('\n')
      .trim()

    if (text) {
      return text
    }
  }

  return null
}

function getGeminiErrorMessage(
  data: GeminiResponse,
): string | null {
  const message = data.error?.message

  if (
    typeof message === 'string' &&
    message.trim()
  ) {
    return message.trim()
  }

  const blockReason =
    data.promptFeedback?.blockReason

  if (
    typeof blockReason === 'string' &&
    blockReason.trim()
  ) {
    return blockReason.trim()
  }

  return null
}

function getRetryAfterSeconds(
  response: Response,
): number | null {
  const header = response.headers.get(
    'retry-after',
  )

  if (!header) {
    return null
  }

  const seconds = Number(header)

  if (
    !Number.isFinite(seconds) ||
    seconds < 0
  ) {
    return null
  }

  return Math.min(Math.ceil(seconds), 60)
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID()

  try {
    /*
     * ---------------------------------------------------------
     * 1. Content-Type
     * ---------------------------------------------------------
     */

    const contentType =
      request.headers.get('content-type') ?? ''

    if (
      !contentType
        .toLowerCase()
        .includes('application/json')
    ) {
      return jsonError(
        'La solicitud debe utilizar Content-Type: application/json.',
        415,
        'UNSUPPORTED_MEDIA_TYPE',
      )
    }

    /*
     * ---------------------------------------------------------
     * 2. Protección básica del tamaño del request
     * ---------------------------------------------------------
     */

    const contentLength =
      request.headers.get('content-length')

    if (
      contentLength &&
      Number.isFinite(Number(contentLength)) &&
      Number(contentLength) > MAX_BODY_SIZE
    ) {
      return jsonError(
        'La solicitud es demasiado grande.',
        413,
        'PAYLOAD_TOO_LARGE',
      )
    }

    /*
     * ---------------------------------------------------------
     * 3. API Key exclusivamente servidor
     * ---------------------------------------------------------
     *
     * NUNCA utilizar:
     *
     * NEXT_PUBLIC_GEMINI_API_KEY
     *
     * Las variables NEXT_PUBLIC_* pueden terminar expuestas
     * al navegador.
     */

    const apiKey =
      process.env.GEMINI_API_KEY?.trim()

    if (!apiKey) {
      console.error(
        `[ai:${requestId}] GEMINI_API_KEY is not configured`,
      )

      return jsonError(
        'El servicio de inteligencia artificial no está configurado.',
        503,
        'AI_NOT_CONFIGURED',
      )
    }

    /*
     * ---------------------------------------------------------
     * 4. Parsear JSON
     * ---------------------------------------------------------
     */

    let body: AssistantRequestBody

    try {
      body = await request.json()
    } catch {
      return jsonError(
        'El cuerpo de la solicitud no contiene JSON válido.',
        400,
        'INVALID_JSON',
      )
    }

    /*
     * ---------------------------------------------------------
     * 5. Validar mensaje
     * ---------------------------------------------------------
     */

    const message = normalizeMessage(
      body.message,
    )

    if (!message) {
      return jsonError(
        `El mensaje es obligatorio y no puede superar los ${MAX_MESSAGE_LENGTH.toLocaleString('es-ES')} caracteres.`,
        400,
        'INVALID_MESSAGE',
      )
    }

    /*
     * ---------------------------------------------------------
     * 6. Construcción del prompt
     * ---------------------------------------------------------
     *
     * El sistema puede evolucionar posteriormente hacia
     * un asistente especializado en:
     *
     * - Marketplace
     * - B2B
     * - productos
     * - afiliados
     * - órdenes
     * - pagos
     * - soporte
     *
     * No se debe permitir que el usuario sustituya las reglas
     * internas del sistema simplemente enviando instrucciones
     * dentro de "message".
     */

    const systemInstruction = `
Eres el asistente inteligente de Credi Marketplace.

Tu función es ayudar a los usuarios de forma clara, profesional,
precisa y segura.

Ámbitos principales:
- Marketplace.
- Productos y categorías.
- Compras y checkout.
- Órdenes.
- Afiliados.
- Mercado B2B.
- Información general sobre el funcionamiento de la plataforma.

Reglas:
- No inventes productos, precios, disponibilidad, órdenes, pagos,
  descuentos o políticas que no hayan sido proporcionados por el sistema.
- No afirmes que un pago fue realizado si no existe confirmación
  del sistema.
- No solicites contraseñas, claves privadas, semillas de wallets,
  códigos 2FA ni credenciales sensibles.
- No expongas secretos internos.
- Si no tienes información suficiente, indícalo claramente.
- Mantén respuestas útiles, concisas y profesionales.
`.trim()

    /*
     * ---------------------------------------------------------
     * 7. Endpoint Gemini
     * ---------------------------------------------------------
     */

    const endpoint =
      `${GEMINI_API_BASE_URL}/${encodeURIComponent(DEFAULT_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`

    /*
     * ---------------------------------------------------------
     * 8. Timeout
     * ---------------------------------------------------------
     */

    const controller = new AbortController()

    const timeout = setTimeout(() => {
      controller.abort()
    }, REQUEST_TIMEOUT_MS)

    let geminiResponse: Response

    try {
      geminiResponse = await fetch(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: systemInstruction,
                },
              ],
            },

            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: message,
                  },
                ],
              },
            ],

            generationConfig: {
              temperature: 0.4,
              topP: 0.9,
              maxOutputTokens: 1_024,
            },
          }),

          signal: controller.signal,

          cache: 'no-store',
        },
      )
    } catch (error: unknown) {
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        console.error(
          `[ai:${requestId}] Gemini request timeout`,
        )

        return jsonError(
          'El servicio de inteligencia artificial tardó demasiado en responder.',
          504,
          'AI_TIMEOUT',
        )
      }

      console.error(
        `[ai:${requestId}] Gemini network error`,
        error,
      )

      return jsonError(
        'No fue posible comunicarse con el servicio de inteligencia artificial.',
        502,
        'AI_PROVIDER_UNAVAILABLE',
      )
    } finally {
      clearTimeout(timeout)
    }

    /*
     * ---------------------------------------------------------
     * 9. Leer respuesta del proveedor
     * ---------------------------------------------------------
     */

    let data: GeminiResponse

    try {
      data =
        (await geminiResponse.json()) as GeminiResponse
    } catch (error: unknown) {
      console.error(
        `[ai:${requestId}] Invalid Gemini response`,
        error,
      )

      return jsonError(
        'El proveedor de inteligencia artificial devolvió una respuesta inválida.',
        502,
        'INVALID_AI_RESPONSE',
      )
    }

    /*
     * ---------------------------------------------------------
     * 10. Errores HTTP del proveedor
     * ---------------------------------------------------------
     */

    if (!geminiResponse.ok) {
      console.error(
        `[ai:${requestId}] Gemini HTTP ${geminiResponse.status}`,
        {
          providerError:
            data.error?.message,
          providerStatus:
            data.error?.status,
        },
      )

      if (geminiResponse.status === 401) {
        return jsonError(
          'La configuración del servicio de inteligencia artificial no es válida.',
          502,
          'AI_AUTHENTICATION_FAILED',
        )
      }

      if (geminiResponse.status === 403) {
        return jsonError(
          'El servicio de inteligencia artificial no tiene autorización para procesar esta solicitud.',
          502,
          'AI_ACCESS_DENIED',
        )
      }

      if (geminiResponse.status === 429) {
        const retryAfter =
          getRetryAfterSeconds(
            geminiResponse,
          )

        const response = jsonError(
          'El servicio de inteligencia artificial está temporalmente saturado. Intenta nuevamente en unos segundos.',
          429,
          'AI_RATE_LIMITED',
        )

        if (retryAfter !== null) {
          response.headers.set(
            'Retry-After',
            String(retryAfter),
          )
        }

        return response
      }

      if (
        geminiResponse.status >= 500
      ) {
        return jsonError(
          'El servicio de inteligencia artificial no está disponible temporalmente.',
          502,
          'AI_PROVIDER_ERROR',
        )
      }

      return jsonError(
        'No fue posible procesar la solicitud de inteligencia artificial.',
        502,
        'AI_REQUEST_FAILED',
      )
    }

    /*
     * ---------------------------------------------------------
     * 11. Extraer respuesta
     * ---------------------------------------------------------
     */

    const reply =
      extractGeminiReply(data)

    if (!reply) {
      console.warn(
        `[ai:${requestId}] Gemini returned no usable text`,
        {
          blockReason:
            data.promptFeedback?.blockReason,
        },
      )

      const providerMessage =
        getGeminiErrorMessage(data)

      if (providerMessage) {
        return jsonError(
          'La solicitud no pudo generar una respuesta.',
          422,
          'AI_NO_RESPONSE',
        )
      }

      return jsonError(
        'El asistente no pudo generar una respuesta en este momento.',
        502,
        'AI_EMPTY_RESPONSE',
      )
    }

    /*
     * ---------------------------------------------------------
     * 12. Respuesta pública normalizada
     * ---------------------------------------------------------
     */

    return NextResponse.json(
      {
        success: true,
        reply,
        model: DEFAULT_MODEL,
        request_id: requestId,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch (error: unknown) {
    console.error(
      `[ai:${requestId}] Unexpected server error`,
      error,
    )

    return jsonError(
      'Ocurrió un error inesperado al procesar la solicitud.',
      500,
      'INTERNAL_SERVER_ERROR',
    )
  }
}
