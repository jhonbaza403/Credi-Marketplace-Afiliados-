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
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
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
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
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
      { error: `El prompt supera el máximo de ${AI_LIMITS.maxInputCharacters} caracteres` },
      { status: 413 },
    );
  }

  const requestId = crypto.randomUUID();
  const timeoutMs = Math.min(Math.max(AI_LIMITS.timeout, 8_000), 18_000);

  try {
    const result = await Promise.race([
      generateGeminiText(prompt, { maxOutputTokens: AI_LIMITS.maxTokens, thinkingLevel: "low" }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Tiempo de espera agotado")), timeoutMs);
      }),
    ]);

    return NextResponse.json(
      { text: result },
      { status: 200, headers: { "Cache-Control": "no-store", "X-Credi-AI-Request": requestId } },
    );
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Unknown error";
    console.error("AI request failed", { requestId, userId: user.id, error: raw });

    const isTimeout = raw === "Tiempo de espera agotado";
    return NextResponse.json(
      {
        error: isTimeout
          ? "Credi AI está tardando más de lo esperado. Prueba una solicitud más concreta."
          : "No fue posible procesar la solicitud de IA",
        code: isTimeout ? "AI_TIMEOUT" : "AI_PROVIDER_ERROR",
        request_id: requestId,
      },
      { status: isTimeout ? 504 : 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
