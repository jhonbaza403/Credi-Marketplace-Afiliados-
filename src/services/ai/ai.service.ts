import "server-only";

import { generateGeminiText } from "@/lib/ai/gemini";

export interface AIRequest {
  prompt: string;
  userId: string;
}

/**
 * Compatibility service.
 * The provider integration and model configuration are centralized
 * in src/lib/ai/gemini.ts. Authentication and rate limiting remain
 * responsibilities of the calling route/application service.
 */
export async function askAI(input: AIRequest): Promise<{ message: string }> {
  if (!input || typeof input.prompt !== "string") {
    throw new Error("Prompt inválido");
  }

  const prompt = input.prompt.trim();
  if (!prompt) {
    throw new Error("Prompt vacío");
  }

  if (prompt.length > 10_000) {
    throw new Error("Prompt demasiado largo");
  }

  return {
    message: await generateGeminiText(prompt),
  };
}
