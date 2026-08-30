import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ============================================================
 * CREDI MARKETPLACE
 * API: POST /api/checkout
 *
 * Responsabilidad:
 *   Preparar y crear una orden pendiente multi-producto.
 *
 * Seguridad:
 *   - Usuario obtenido desde Supabase Auth.
 *   - Nunca confiar en customerId del cliente.
 *   - Nunca confiar en price del cliente.
 *   - Nunca confiar en totalAmount del cliente.
 *   - Nunca confiar en commissionAmount del cliente.
 *   - Precios calculados exclusivamente por PostgreSQL.
 *   - Inventario validado/bloqueado por RPC.
 *   - Creación transaccional mediante:
 *
 *       create_pending_order_batch
 *
 * El pago NO se confirma aquí.
 * ============================================================
 */

const MAX_ITEMS = 50
const MAX_QUANTITY_PER_ITEM = 100

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z
          .string()
          .uuid('Identificador de producto inválido.'),

        quantity: z
          .number()
          .int()
          .min(1)
          .max(MAX_QUANTITY_PER_ITEM),
      }),
    )
    .min(1, 'El carrito no puede estar vacío.')
    .max(MAX_ITEMS, `No puedes procesar más de ${MAX_ITEMS} productos.`),

  affiliate_ref: z
    .string()
    .trim()
    .max(128)
    .optional()
    .nullable(),

  region: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .optional()
    .default('GLOBAL'),
})

type CheckoutPayload = z.infer<typeof checkoutSchema>

function jsonError(
  message: string,
  status: number,
  code: string,
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code,
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}

function getRequestId(request: Request): string {
  const suppliedId = request.headers.get('x-request-id')

  if (
    suppliedId &&
    suppliedId.length <= 128 &&
    /^[a-zA-Z0-9._:-]+$/.test(suppliedId)
  ) {
    return suppliedId
  }

  return crypto.randomUUID()
}

export async function POST(request: Request) {
  const requestId = getRequestId(request)

  try {
    /*
     * ---------------------------------------------------------
     * 1. Content-Type
     * ---------------------------------------------------------
     */

    const contentType =
      request.headers.get('content-type') ?? ''

    if (!contentType.toLowerCase().includes('application/json')) {
      return jsonError(
        'La solicitud debe utilizar Content-Type: application/json.',
        415,
        'UNSUPPORTED_MEDIA_TYPE',
      )
    }

    /*
     * ---------------------------------------------------------
     * 2. Autenticación
     * ---------------------------------------------------------
     *
     * El customerId NO viene del frontend.
     *
     * La identidad verdadera es auth.uid().
     * ---------------------------------------------------------
     */

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error(
        `[checkout:${requestId}] Authentication error`,
        authError,
      )

      return jsonError(
        'No fue posible verificar tu sesión.',
        401,
        'AUTHENTICATION_ERROR',
      )
    }

    if (!user) {
      return jsonError(
        'Debes iniciar sesión para continuar con el checkout.',
        401,
        'UNAUTHENTICATED',
      )
    }

    /*
     * ---------------------------------------------------------
     * 3. Parsear JSON
     * ---------------------------------------------------------
     */

    let rawBody: unknown

    try {
      rawBody = await request.json()
    } catch {
      return jsonError(
        'El cuerpo de la solicitud no contiene JSON válido.',
        400,
        'INVALID_JSON',
      )
    }

    /*
     * ---------------------------------------------------------
     * 4. Validación estricta
     * ---------------------------------------------------------
     */

    const parsed = checkoutSchema.safeParse(rawBody)

    if (!parsed.success) {
      return jsonError(
        'Los datos del checkout no son válidos.',
        400,
        'INVALID_CHECKOUT_DATA',
      )
    }

    const payload: CheckoutPayload = parsed.data

    /*
     * ---------------------------------------------------------
     * 5. Normalizar productos duplicados
     * ---------------------------------------------------------
     *
     * Si el frontend accidentalmente envía:
     *
     * product A × 2
     * product A × 3
     *
     * lo convertimos en:
     *
     * product A × 5
     *
     * antes de enviarlo a PostgreSQL.
     * ---------------------------------------------------------
     */

    const quantityByProduct = new Map<string, number>()

    for (const item of payload.items) {
      const current =
        quantityByProduct.get(item.product_id) ?? 0

      const nextQuantity =
        current + item.quantity

      if (nextQuantity > MAX_QUANTITY_PER_ITEM) {
        return jsonError(
          `La cantidad máxima por producto es ${MAX_QUANTITY_PER_ITEM}.`,
          400,
          'QUANTITY_LIMIT_EXCEEDED',
        )
      }

      quantityByProduct.set(
        item.product_id,
        nextQuantity,
      )
    }

    const normalizedItems = Array.from(
      quantityByProduct.entries(),
    )
      .map(([product_id, quantity]) => ({
        product_id,
        quantity,
      }))
      /*
       * Orden determinista.
       *
       * Esto ayuda a que PostgreSQL adquiera bloqueos
       * en un orden consistente y reduce el riesgo de
       * deadlocks cuando varios compradores intentan
       * adquirir los mismos productos.
       */
      .sort((a, b) =>
        a.product_id.localeCompare(b.product_id),
      )

    /*
     * ---------------------------------------------------------
     * 6. Affiliate reference
     * ---------------------------------------------------------
     */

    const affiliateRef =
      payload.affiliate_ref?.trim() || null

    /*
     * ---------------------------------------------------------
     * 7. RPC transaccional
     * ---------------------------------------------------------
     *
     * IMPORTANTE:
     *
     * NO enviamos:
     *
     *   customerId
     *   price
     *   totalAmount
     *   commission
     *   sellerAmount
     *
     * porque ninguno de esos valores debe proceder
     * del navegador.
     */

    const { data: rpcData, error: rpcError } =
      await supabase.rpc(
        'create_pending_order_batch',
        {
          p_buyer_id: user.id,

          p_items: normalizedItems,

          p_affiliate_ref: affiliateRef,

          p_region: payload.region,
        },
      )

    if (rpcError) {
      console.error(
        `[checkout:${requestId}] RPC error`,
        rpcError,
      )

      const message =
        rpcError.message?.toLowerCase() ?? ''

      /*
       * -------------------------------------------------------
       * Inventario
       * -------------------------------------------------------
       */

      if (
        message.includes('insufficient_stock') ||
        message.includes('stock_changed') ||
        message.includes('out_of_stock')
      ) {
        return jsonError(
          'Uno o más productos ya no tienen inventario suficiente. Actualiza tu carrito e inténtalo nuevamente.',
          409,
          'STOCK_CHANGED',
        )
      }

      /*
       * -------------------------------------------------------
       * Producto
       * -------------------------------------------------------
       */

      if (
        message.includes('product_not_found') ||
        message.includes('product_inactive')
      ) {
        return jsonError(
          'Uno de los productos seleccionados ya no está disponible.',
          409,
          'PRODUCT_NOT_AVAILABLE',
        )
      }

      /*
       * -------------------------------------------------------
       * Afiliado
       * -------------------------------------------------------
       */

      if (
        message.includes('invalid_affiliate')
      ) {
        return jsonError(
          'La referencia de afiliado no es válida.',
          400,
          'INVALID_AFFILIATE',
        )
      }

      /*
       * -------------------------------------------------------
       * Autenticación
       * -------------------------------------------------------
       */

      if (
        message.includes('unauthenticated') ||
        message.includes('buyer_mismatch')
      ) {
        return jsonError(
          'La sesión no es válida para realizar esta operación.',
          401,
          'INVALID_SESSION',
        )
      }

      /*
       * -------------------------------------------------------
       * Payload
       * -------------------------------------------------------
       */

      if (
        message.includes('invalid_payload') ||
        message.includes('invalid_quantity') ||
        message.includes('empty_order')
      ) {
        return jsonError(
          'Los datos de la orden no son válidos.',
          400,
          'INVALID_ORDER',
        )
      }

      /*
       * -------------------------------------------------------
       * Error genérico
       * -------------------------------------------------------
       */

      return jsonError(
        'No fue posible crear la orden. Inténtalo nuevamente.',
        500,
        'ORDER_CREATION_FAILED',
      )
    }

    /*
     * ---------------------------------------------------------
     * 8. Normalizar respuesta RPC
     * ---------------------------------------------------------
     */

    const result =
      Array.isArray(rpcData)
        ? rpcData[0]
        : rpcData

    if (
      !result ||
      typeof result !== 'object' ||
      typeof result.order_id !== 'string'
    ) {
      console.error(
        `[checkout:${requestId}] Invalid RPC response`,
        rpcData,
      )

      return jsonError(
        'La orden no pudo ser confirmada correctamente. Contacta al soporte.',
        500,
        'INVALID_ORDER_RESPONSE',
      )
    }

    /*
     * ---------------------------------------------------------
     * 9. Respuesta pública
     * ---------------------------------------------------------
     *
     * El servidor devuelve el total calculado por PostgreSQL.
     *
     * Nunca utilizamos un total enviado por el cliente.
     */

    const responseBody = {
      success: true,

      orderId: result.order_id,

      status:
        typeof result.status === 'string'
          ? result.status
          : 'pending',

      totalAmount:
        typeof result.total_amount === 'number'
          ? result.total_amount
          : Number(result.total_amount ?? 0),

      currency:
        typeof result.currency === 'string'
          ? result.currency
          : 'USD',

      itemCount:
        typeof result.item_count === 'number'
          ? result.item_count
          : normalizedItems.length,

      message:
        'Orden creada correctamente. Continúa con el proceso de pago.',
    }

    return NextResponse.json(
      responseBody,
      {
        status: 201,
        headers: {
          'Cache-Control': 'no-store',
          'X-Request-ID': requestId,
        },
      },
    )
  } catch (error: unknown) {
    console.error(
      `[checkout:${requestId}] Unexpected error`,
      error,
    )

    return jsonError(
      'Ocurrió un error inesperado al procesar el checkout.',
      500,
      'INTERNAL_SERVER_ERROR',
    )
  }
}
