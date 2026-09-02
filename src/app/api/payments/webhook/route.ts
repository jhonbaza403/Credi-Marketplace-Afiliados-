```ts
import { NextResponse } from "next/server";

import type {
  PaymentProvider,
} from "@/lib/payments/types";

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

function isPaymentProvider(
  value: unknown,
): value is PaymentProvider {
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
    const body =
      (await request.json()) as WebhookPayload;

    if (!isPaymentProvider(body.provider)) {
      return NextResponse.json(
        {
          success: false,
          error: "Proveedor de pago inválido.",
        },
        { status: 400 },
      );
    }

    if (typeof body.event_id !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Identificador de evento requerido.",
        },
        { status: 400 },
      );
    }

    /*
     * MUY IMPORTANTE:
     *
     * Esta implementación NO debe marcar pagos
     * como completados todavía.
     *
     * Cada proveedor requiere una verificación
     * criptográfica distinta.
     *
     * Ejemplo:
     *
     * PayPal:
     *   verificar firma/evento contra API de PayPal.
     *
     * Binance Pay:
     *   verificar autenticidad según su mecanismo
     *   oficial.
     *
     * USDT:
     *   verificar on-chain la transacción,
     *   blockchain, token, cantidad,
     *   dirección receptora y confirmations.
     */

    console.warn(
      `[payment-webhook:${requestId}] Evento recibido pendiente de verificación`,
      {
        provider: body.provider,
        eventId: body.event_id,
        eventType: body.event_type,
      },
    );

    /*
     * Próximo paso:
     *
     * process_verified_payment_webhook(...)
     *
     * mediante RPC idempotente.
     */

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
    console.error(
      `[payment-webhook:${requestId}] Error procesando webhook`,
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Webhook inválido.",
      },
      {
        status: 400,
      },
    );
  }
}
```
