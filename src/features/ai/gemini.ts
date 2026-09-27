import "server-only";

import { generateGeminiText, isGeminiConfigured } from "@/lib/ai/gemini";

export { isGeminiConfigured };

/**
 * Compatibility adapter.
 * The canonical Gemini integration lives in src/lib/ai/gemini.ts.
 */
export async function askGeminiAssistant(
  prompt: string,
  context?: string,
): Promise<string> {
  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) {
    throw new Error("El prompt no puede estar vacío.");
  }

  const normalizedContext = context?.trim();
  const finalPrompt = normalizedContext
    ? [
        "Eres el asistente inteligente de Credi Marketplace.",
        "Responde de manera clara, profesional y precisa.",
        "No inventes información que no esté disponible en el contexto proporcionado.",
        "",
        "CONTEXTO PROPORCIONADO:",
        normalizedContext,
        "",
        "CONSULTA DEL USUARIO:",
        normalizedPrompt,
      ].join("\n")
    : normalizedPrompt;

  return generateGeminiText(finalPrompt);
}
