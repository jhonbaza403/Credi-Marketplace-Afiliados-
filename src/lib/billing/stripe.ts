import "server-only";

import crypto from "node:crypto";

const STRIPE_API = "https://api.stripe.com/v1";

function requiredStripeKey(): string {
  const value = process.env.STRIPE_SECRET_KEY?.trim();
  if (!value) throw new Error("Falta STRIPE_SECRET_KEY.");
  return value;
}

export async function stripeRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${STRIPE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requiredStripeKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    const message = typeof body === "object" && body && "error" in body
      ? String((body as { error?: { message?: string } }).error?.message ?? "Stripe request failed")
      : "Stripe request failed";
    throw new Error(message);
  }

  return body as T;
}

export function verifyStripeWebhookSignature(rawBody: string, signatureHeader: string): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !signatureHeader) return false;

  const parts = signatureHeader.split(",");
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  if (Math.abs(Date.now() / 1000 - timestampSeconds) > 300) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");

  return signatures.some((signature) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  });
}

export type StripeCheckoutSession = {
  id: string;
  url: string | null;
  customer: string | null;
  subscription: string | null;
  metadata?: Record<string, string>;
};

export type StripeSubscription = {
  id: string;
  customer: string | null;
  status: string;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  metadata?: Record<string, string>;
  items?: { data?: Array<{ price?: { currency?: string; unit_amount?: number | null; recurring?: { interval?: string } } }> };
};

export type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};
