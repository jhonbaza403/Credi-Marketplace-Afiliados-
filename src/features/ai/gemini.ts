// ==========================================================
// ARCHIVO: src/features/ai/gemini.ts
// Credi Marketplace
//
// Servicio centralizado de Inteligencia Artificial.
//
// Tecnología:
// - Next.js 16.3
// - Node.js 24
// - TypeScript
// - Google Gemini API
// - @google/genai
//
// SEGURIDAD:
// - Solo servidor
// - Nunca utilizar en Client Components
// - GEMINI_API_KEY jamás debe exponerse al navegador
// - Validación de entradas
// - Límites de tamaño
// - Manejo controlado de errores
// ==========================================================

import 'server-only';

import { GoogleGenAI } from '@google/genai';

// ==========================================================
// CONFIGURACIÓN
// ==========================================================

const GEMINI_MODEL =
  process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';

const MAX_PROMPT_LENGTH = 10_000;
const MAX_CONTEXT_LENGTH = 20_000;

// ==========================================================
// CLIENTE GEMINI
// ==========================================================

let geminiClient: GoogleGenAI | null = null;

/**
 * Obtiene el cliente singleton de Gemini.
 *
 * La API key solamente se lee en el servidor.
 */
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'La variable de entorno GEMINI_API_KEY no está configurada.'
    );
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
    });
  }

  return geminiClient;
}

// ==========================================================
// VALIDACIÓN DE ENTRADAS
// ==========================================================

function validatePrompt(prompt: string): string {
  if (typeof prompt !== 'string') {
    throw new Error('El prompt debe ser una cadena de texto.');
  }

  const normalizedPrompt = prompt.trim();

  if (!normalizedPrompt) {
    throw new Error('El prompt no puede estar vacío.');
  }

  if (normalizedPrompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(
      `El prompt excede el límite permitido de ${MAX_PROMPT_LENGTH} caracteres.`
    );
  }

  return normalizedPrompt;
}

function validateContext(
  context: string | undefined
): string | undefined {
  if (context === undefined) {
    return undefined;
  }

  if (typeof context !== 'string') {
    throw new Error(
      'El contexto debe ser una cadena de texto.'
    );
  }

  const normalizedContext = context.trim();

  if (!normalizedContext) {
    return undefined;
  }

  if (normalizedContext.length > MAX_CONTEXT_LENGTH) {
    throw new Error(
      `El contexto excede el límite permitido de ${MAX_CONTEXT_LENGTH} caracteres.`
    );
  }

  return normalizedContext;
}

// ==========================================================
// CONSTRUCCIÓN DEL PROMPT
// ==========================================================

function buildPrompt(
  prompt: string,
  context?: string
): string {
  const sections: string[] = [
    'Eres el asistente inteligente de Credi Marketplace.',
    'Responde de manera clara, profesional y precisa.',
    'No inventes información que no esté disponible en el contexto proporcionado.',
  ];

  if (context) {
    sections.push(
      '',
      'CONTEXTO PROPORCIONADO:',
      context
    );
  }

  sections.push(
    '',
    'CONSULTA DEL USUARIO:',
    prompt
  );

  return sections.join('\n');
}

// ==========================================================
// CONSULTA PRINCIPAL
// ==========================================================

/**
 * Envía una consulta de texto a Gemini.
 *
 * Esta función debe ejecutarse exclusivamente en servidor.
 */
export async function askGeminiAssistant(
  prompt: string,
  context?: string
): Promise<string> {
  const validatedPrompt = validatePrompt(prompt);
  const validatedContext = validateContext(context);

  const finalPrompt = buildPrompt(
    validatedPrompt,
    validatedContext
  );

  try {
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: finalPrompt,
    });

    const text = response.text?.trim();

    if (!text) {
      throw new Error(
        'Gemini no devolvió contenido utilizable.'
      );
    }

    return text;
  } catch (error: unknown) {
    console.error(
      '[Gemini] Error al procesar la solicitud:',
      error instanceof Error
        ? error.message
        : 'Error desconocido'
    );

    throw new Error(
      'No fue posible procesar la consulta con el asistente de IA.'
    );
  }
}
