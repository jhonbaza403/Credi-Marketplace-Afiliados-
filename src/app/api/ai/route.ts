import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";

import { AI_LIMITS } from "@/lib/ai/limits";
import { generateOpenAIText, isOpenAIConfigured, type CrediAiMode } from "@/lib/ai/openai";
import { generateGeminiText, isGeminiConfigured } from "@/lib/ai/gemini";
import { distributedRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/auth";
import { isSameOrigin } from "@/lib/security/csrf";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  prompt: z.string().trim().min(1).max(AI_LIMITS.maxInputCharacters),
  mode: z.enum(["copilot", "sales", "marketing", "strategy", "intelligence"]).default("copilot"),
  sessionId: z.string().uuid().nullable().optional(),
});

type ProviderFailure = {
  status: number | null;
  code: string | null;
  retryable: boolean;
};

const errorResponse = (
  error: string,
  status: number,
  code: string,
  requestId?: string,
  diagnostics?: Record<string, unknown>,
) =>
  NextResponse.json(
    { error, code, request_id: requestId, diagnostics },
    { status, headers: { "Cache-Control": "no-store" } },
  );

function safetyIdentifier(userId: string) {
  return "credi_" + createHash("sha256").update(userId).digest("hex").slice(0, 32);
}

function classifyProviderFailure(error: unknown): ProviderFailure {
  const candidate = error as {
    status?: unknown;
    code?: unknown;
    type?: unknown;
    name?: unknown;
  };

  const status = typeof candidate.status === "number" ? candidate.status : null;
  const rawCode =
    typeof candidate.code === "string"
      ? candidate.code
      : typeof candidate.type === "string"
        ? candidate.type
        : typeof candidate.name === "string"
          ? candidate.name
          : null;

  const code =
    typeof rawCode === "string" && /^[A-Za-z0-9._:-]{1,80}$/.test(rawCode)
      ? rawCode
      : null;

  return {
    status,
    code,
    retryable: status === null || status === 408 || status === 409 || status === 429 || status >= 500,
  };
}

function providerDiagnostics(
  openAiConfigured: boolean,
  openAiFailure: ProviderFailure | null,
  geminiConfigured: boolean,
  geminiFailure: ProviderFailure | null,
) {
  return {
    openai: openAiConfigured
      ? openAiFailure
        ? {
            status: openAiFailure.status,
            code: openAiFailure.code,
            retryable: openAiFailure.retryable,
          }
        : { status: 200, code: "ok", retryable: false }
      : { status: null, code: "not_configured", retryable: false },
    gemini: geminiConfigured
      ? geminiFailure
        ? {
            status: geminiFailure.status,
            code: geminiFailure.code,
            retryable: geminiFailure.retryable,
          }
        : { status: 200, code: "ok", retryable: false }
      : { status: null, code: "not_configured", retryable: false },
  };
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    if (!isSameOrigin(request)) {
      return errorResponse("Origen no autorizado.", 403, "CSRF_VALIDATION_FAILED", requestId);
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return errorResponse("No fue posible verificar la sesión.", 401, "AUTHENTICATION_ERROR", requestId);
    }
    if (!user) {
      return errorResponse("No autenticado.", 401, "UNAUTHENTICATED", requestId);
    }

    const limit = await distributedRateLimit(
      supabase,
      `ai:${user.id}:${getRequestIp(request)}`,
      { limit: AI_LIMITS.requestsPerMinute, windowMs: 60_000 },
    );
    if (!limit.success) {
      return errorResponse(
        "Límite de solicitudes de IA alcanzado. Inténtalo más tarde.",
        429,
        "AI_RATE_LIMITED",
        requestId,
      );
    }

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return errorResponse("La solicitud de IA no es válida.", 400, "INVALID_AI_REQUEST", requestId);
    }

    let sessionId = parsed.data.sessionId ?? null;
    let previousResponseId: string | null = null;

    if (sessionId) {
      const { data: session } = await supabase
        .from("ai_sessions")
        .select("id,mode,last_response_id")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!session) {
        return errorResponse("Sesión de IA no encontrada.", 404, "AI_SESSION_NOT_FOUND", requestId);
      }
      previousResponseId = session.last_response_id;
    } else {
      const { data: created, error: sessionError } = await supabase
        .from("ai_sessions")
        .insert({ user_id: user.id, mode: parsed.data.mode })
        .select("id")
        .single();

      if (sessionError || !created) {
        console.error("[credi-ai] session create failed", {
          requestId,
          userId: user.id,
          error: sessionError?.message,
        });
        return errorResponse(
          "No fue posible iniciar la sesión de Credi AI.",
          500,
          "AI_SESSION_CREATE_FAILED",
          requestId,
        );
      }
      sessionId = created.id;
    }

    const prompt = [
      `Modo de trabajo: ${parsed.data.mode}`,
      "Contexto de plataforma: Credi Marketplace integra Marketplace, servicios profesionales, B2B, afiliados, contenido, LIVE, Marketing, Business OS, Wallet y operaciones comerciales.",
      "Solicitud del usuario:",
      parsed.data.prompt,
    ].join("\n\n");

    const identifier = safetyIdentifier(user.id);
    const openAiConfigured = isOpenAIConfigured();
    const geminiConfigured = isGeminiConfigured();
    let openAiFailure: ProviderFailure | null = null;
    let geminiFailure: ProviderFailure | null = null;

    if (openAiConfigured) {
      try {
        const result = await generateOpenAIText({
          prompt,
          mode: parsed.data.mode as CrediAiMode,
          previousResponseId,
          safetyIdentifier: identifier,
        });

        const { error: saveError } = await supabase
          .from("ai_sessions")
          .update({
            mode: parsed.data.mode,
            last_response_id: result.responseId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sessionId)
          .eq("user_id", user.id);

        if (saveError) {
          console.error("[credi-ai] session update failed", {
            requestId,
            userId: user.id,
            error: saveError.message,
          });
        }

        return NextResponse.json(
          {
            text: result.text,
            provider: "openai",
            model: result.model,
            session_id: sessionId,
            request_id: requestId,
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch (openAiError) {
        openAiFailure = classifyProviderFailure(openAiError);
        console.error("[credi-ai] OpenAI provider failed", {
          requestId,
          userId: user.id,
          status: openAiFailure.status,
          code: openAiFailure.code,
          retryable: openAiFailure.retryable,
        });
      }
    }

    if (geminiConfigured) {
      try {
        const result = await Promise.race([
          generateGeminiText(prompt, { maxOutputTokens: AI_LIMITS.maxTokens }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("AI_TIMEOUT")), Math.min(AI_LIMITS.timeout, 30_000)),
          ),
        ]);

        return NextResponse.json(
          {
            text: result,
            provider: "gemini",
            model: process.env.GEMINI_MODEL?.trim() || "configured",
            session_id: sessionId,
            request_id: requestId,
            fallback: Boolean(openAiFailure),
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch (geminiError) {
        geminiFailure = classifyProviderFailure(geminiError);
        console.error("[credi-ai] Gemini provider failed", {
          requestId,
          userId: user.id,
          status: geminiFailure.status,
          code: geminiFailure.code,
          retryable: geminiFailure.retryable,
        });
      }
    }

    const diagnostics = providerDiagnostics(
      openAiConfigured,
      openAiFailure,
      geminiConfigured,
      geminiFailure,
    );

    console.error("[credi-ai] all providers failed", {
      requestId,
      userId: user.id,
      diagnostics,
    });

    return errorResponse(
      "Credi AI no pudo conectar con ningún proveedor disponible.",
      openAiFailure?.status === 401 || openAiFailure?.status === 403
        ? 502
        : geminiFailure?.status === 401 || geminiFailure?.status === 403
          ? 502
          : 503,
      "AI_ALL_PROVIDERS_FAILED",
      requestId,
      diagnostics,
    );
  } catch (error) {
    console.error("[credi-ai] request failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(
      "No fue posible procesar la solicitud de IA.",
      502,
      "AI_PROVIDER_ERROR",
      requestId,
    );
  }
}
