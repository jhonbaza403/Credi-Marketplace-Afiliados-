import { NextResponse } from "next/server";

import { createB2BCryptoCheckout, CryptoPaymentError } from "@/services/payments/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { orderId?: unknown };

    if (typeof body.orderId !== "string" || !body.orderId.trim()) {
      return NextResponse.json(
        { error: "orderId es obligatorio." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const checkoutUrl = await createB2BCryptoCheckout(body.orderId.trim());

    return NextResponse.json(
      { checkoutUrl },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    if (error instanceof CryptoPaymentError) {
      const status = error.message.includes("iniciar sesión") ? 401 : 400;
      return NextResponse.json(
        { error: error.message },
        { status, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { error: "No fue posible iniciar el pago B2B." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
