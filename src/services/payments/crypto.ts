import "server-only";

import { env } from "@/env";
import { createClient } from "@/lib/supabase/server";

const STRIPE_API_URL = "https://api.stripe.com/v1";

export class CryptoPaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CryptoPaymentError";
  }
}

export async function createB2BCryptoCheckout(orderId: string) {
  if (env.B2B_CRYPTO_ENABLED !== "true") {
    throw new CryptoPaymentError("Los pagos B2B con stablecoins no están habilitados.");
  }

  if (env.B2B_CRYPTO_MERCHANT_COUNTRY !== "US") {
    throw new CryptoPaymentError(
      "El proveedor de stablecoins configurado actualmente solo está habilitado para comercios de EE. UU.",
    );
  }

  if (!env.STRIPE_SECRET_KEY) {
    throw new CryptoPaymentError("El proveedor de pagos B2B no está configurado.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new CryptoPaymentError("Debes iniciar sesión para pagar un pedido B2B.");
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, buyer_id, total_amount, currency, status, payment_status")
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .maybeSingle();

  if (orderError || !order) {
    throw new CryptoPaymentError("No se encontró el pedido B2B.");
  }

  if (order.status !== "pending" || order.payment_status !== "pending") {
    throw new CryptoPaymentError("Este pedido no está disponible para iniciar un nuevo pago.");
  }

  if (order.currency !== "USD") {
    throw new CryptoPaymentError(
      "El checkout con stablecoins requiere que el pedido B2B esté expresado en USD.",
    );
  }

  const amount = Number(order.total_amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) {
    throw new CryptoPaymentError("El importe del pedido no es válido para el checkout con stablecoins.");
  }

  const { data: existingIntent } = await supabase
    .from("b2b_crypto_payment_intents")
    .select("checkout_url, status, expires_at")
    .eq("order_id", orderId)
    .eq("provider", "stripe")
    .in("status", ["created", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingIntent?.checkout_url) {
    return existingIntent.checkout_url;
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.append("payment_method_types[]", "crypto");
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][product_data][name]", `Pedido B2B ${order.id}`);
  params.set("line_items[0][price_data][unit_amount]", String(Math.round(amount * 100)));
  params.set("line_items[0][quantity]", "1");
  params.set("success_url", `${appUrl}/checkout/success?order=${encodeURIComponent(order.id)}`);
  params.set("cancel_url", `${appUrl}/checkout?order=${encodeURIComponent(order.id)}`);
  params.set("client_reference_id", order.id);
  params.set("metadata[order_id]", order.id);
  params.set("metadata[payment_type]", "b2b_crypto");

  const response = await fetch(`${STRIPE_API_URL}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new CryptoPaymentError("No fue posible crear el checkout con stablecoins.");
  }

  const session = (await response.json()) as {
    id?: string;
    url?: string;
    expires_at?: number;
  };

  if (!session.id || !session.url) {
    throw new CryptoPaymentError("El proveedor no devolvió un checkout válido.");
  }

  const expiresAt = session.expires_at
    ? new Date(session.expires_at * 1000).toISOString()
    : null;

  const { error: intentError } = await supabase
    .from("b2b_crypto_payment_intents")
    .insert({
      order_id: order.id,
      provider: "stripe",
      provider_payment_id: session.id,
      currency: "USDC",
      network: null,
      amount_usd: amount,
      status: "created",
      checkout_url: session.url,
      expires_at: expiresAt,
    });

  if (intentError) {
    throw new CryptoPaymentError("No fue posible registrar el intento de pago.");
  }

  return session.url;
}
