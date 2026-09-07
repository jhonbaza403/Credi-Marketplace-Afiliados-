import { NextResponse } from "next/server";

import { AI_LIMITS } from "@/lib/ai/limits";
import {
  generateGeminiText,
  isGeminiConfigured,
} from "@/lib/ai/gemini";
import { createClient } from "@/lib/supabase/server";

interface AiRequestBody {
  prompt?: unknown;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAiRequestBody(value: unknown): value is AiRequestBody {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "No autenticado" },
      { status: 401 },
    );
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "El servicio de IA no está configurado" },
      { status: 503 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON inválido" },
      { status: 400 },
    );
  }

  const prompt =
    isAiRequestBody(body) && typeof body.prompt === "string"
      ? body.prompt.trim()
      : "";

  if (!prompt) {
    return NextResponse.json(
      { error: "El campo prompt es obligatorio" },
      { status: 400 },
    );
  }

  if (prompt.length > AI_LIMITS.maxInputCharacters) {
    return NextResponse.json(
      {
        error: `El prompt supera el máximo de ${AI_LIMITS.maxInputCharacters} caracteres`,
      },
      { status: 413 },
    );
  }

  try {
    const result = await Promise.race([
      generateGeminiText(prompt),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Tiempo de espera agotado"));
        }, AI_LIMITS.timeout);
      }),
    ]);

    return NextResponse.json({
      text: result,
    });
  } catch (error) {
    console.error("AI request failed", {
      userId: user.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    const message =
      error instanceof Error &&
      error.message === "Tiempo de espera agotado"
        ? "La solicitud de IA tardó demasiado"
        : "No fue posible procesar la solicitud de IA";

    return NextResponse.json(
      { error: message },
      { status: 502 },
    );
  }
}
