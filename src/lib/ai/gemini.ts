import "server-only";

import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODEL = "gemini-3.8-flash";
const DEFAULT_THINKING_LEVEL = "low" as const;

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta la variable de entorno GEMINI_API_KEY");
  return apiKey;
}

function getModelName(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export async function generateGeminiText(
  prompt: string,
  options: { maxOutputTokens?: number; thinkingLevel?: "low" | "medium" | "high" } = {},
): Promise<string> {
  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) throw new Error("El prompt de Gemini no puede estar vacío");

  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const response = await ai.models.generateContent({
    model: getModelName(),
    contents: normalizedPrompt,
    config: {
      maxOutputTokens: options.maxOutputTokens ?? 1200,
      thinkingConfig: {
        thinkingLevel: options.thinkingLevel ?? DEFAULT_THINKING_LEVEL,
      },
    },
  });

  const text = response.text?.trim() ?? "";
  if (!text) throw new Error("Gemini no devolvió contenido de texto");
  return text;
}
