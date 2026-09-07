import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_MODEL = "gemini-2.5-flash";

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Falta la variable de entorno GEMINI_API_KEY");
  }

  return apiKey;
}

function getModelName(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function generateGeminiText(
  prompt: string,
): Promise<string> {
  const normalizedPrompt = prompt.trim();

  if (!normalizedPrompt) {
    throw new Error("El prompt de Gemini no puede estar vacío");
  }

  const client = new GoogleGenerativeAI(getApiKey());
  const model = client.getGenerativeModel({
    model: getModelName(),
  });

  const result = await model.generateContent(normalizedPrompt);
  const text = result.response.text().trim();

  if (!text) {
    throw new Error("Gemini no devolvió contenido de texto");
  }

  return text;
}
