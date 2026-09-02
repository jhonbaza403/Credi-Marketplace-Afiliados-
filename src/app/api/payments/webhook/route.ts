import { NextResponse } from "next/server";

import type { PaymentProvider } from "@/lib/payments/types";
import { logger } from "@/lib/logging";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WebhookPayload {
  provider?: unknown;
  event_id?: unknown;
  event_type?: unknown;
  order_id?: unknown;
  payment_id?: unknown;
  status?: unknown;
}

function isPaymentProvider(value: unknown): value is PaymentProvider {
  return (
    value === "paypal" ||
    value === "binance_pay" ||
    value === "usdt" ||
    value === "bank_transfer"
  );
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    const body = (await request.json()) as WebhookPayload;

    if (!isPaymentProvider(body.provider)) {
      return NextResponse.json(
        {
          success: false,
          error: "Proveedor de pago inválido.",
        },
        { status: 400 },
      );
    }

    if (typeof body.event_id !== "string" || body.event_id.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          error: "Identificador de evento requerido.",
        },
        { status: 400 },
      );
    }

    logger.warn("Webhook de pago recibido pendiente de verificación", {
      requestId,
      action: "payment_webhook_received",
      metadata: {
        provider: body.provider,
        eventId: body.event_id,
        eventType: body.event_type,
      },
    });

    return NextResponse.json(
      {
        success: true,
        received: true,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    logger.error("Error procesando webhook de pago", {
      requestId,
      action: "payment_webhook_error",
      metadata: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        success: false,
        error: "Webhook inválido.",
      },
      { status: 400 },
    );
  }
}
