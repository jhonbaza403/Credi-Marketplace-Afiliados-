import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  stripeRequest,
  verifyStripeWebhookSignature,
  type StripeEvent,
  type StripeSubscription,
} from "@/lib/billing/stripe";

function toIso(seconds: number | null | undefined): string | null {
  return typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null;
}

function normalizeStatus(status: string): string {
  switch (status) {
    case "trialing":
    case "active":
    case "past_due":
    case "paused":
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
      return status === "canceled" ? "cancelled" : status;
    default:
      return "expired";
  }
}

async function handleSubscription(event: StripeEvent) {
  const object = event.data.object;
  const subscriptionId = String(object.id ?? "");
  if (!subscriptionId) return;

  const metadata = (object.metadata ?? {}) as Record<string, string>;
  const userId = metadata.user_id;
  const planId = metadata.plan_id;
  const providerCustomerId = typeof object.customer === "string" ? object.customer : null;
  const admin = createAdminClient();

  let subscription = object as unknown as StripeSubscription;
  if (!subscription.items) {
    subscription = await stripeRequest<StripeSubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
  }

  if (!userId || !planId) {
    console.warn("billing.webhook.subscription_missing_metadata", event.id, subscriptionId);
    return;
  }

  const status = normalizeStatus(String(subscription.status));
  const interval = metadata.billing_interval === "yearly" ? "yearly" : "monthly";

  const { data: localSubscription, error: upsertError } = await admin
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        plan_id: planId,
        status,
        billing_interval: interval,
        current_period_start: toIso(subscription.current_period_start),
        current_period_end: toIso(subscription.current_period_end),
        cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
        cancelled_at: toIso(subscription.canceled_at),
        provider: "stripe",
        provider_customer_id: providerCustomerId,
        provider_subscription_id: subscriptionId,
        metadata: { stripe_event_id: event.id, plan_code: metadata.plan_code ?? null },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider,provider_subscription_id" },
    )
    .select("id")
    .maybeSingle();

  if (upsertError) throw upsertError;

  const { error: eventError } = await admin.from("subscription_events").insert({
    subscription_id: localSubscription?.id ?? null,
    user_id: userId,
    event_type: event.type,
    provider: "stripe",
    provider_event_id: event.id,
    payload: event.data.object,
  });

  if (eventError && !String(eventError.message).toLowerCase().includes("duplicate")) {
    throw eventError;
  }

  if (event.type === "customer.subscription.deleted") {
    await admin
      .from("billing_transactions")
      .update({ status: "cancelled", metadata: { stripe_event_id: event.id } })
      .eq("subscription_id", localSubscription?.id ?? "00000000-0000-0000-0000-000000000000")
      .eq("provider", "stripe");
  }
}

async function handleCheckoutCompleted(event: StripeEvent) {
  const object = event.data.object;
  const sessionId = String(object.id ?? "");
  const metadata = (object.metadata ?? {}) as Record<string, string>;
  const subscriptionId = typeof object.subscription === "string" ? object.subscription : null;
  const userId = metadata.user_id;
  if (!sessionId || !userId) return;

  const admin = createAdminClient();
  await admin
    .from("billing_transactions")
    .update({
      status: "paid",
      provider_transaction_id: sessionId,
      paid_at: new Date().toISOString(),
      metadata: {
        ...metadata,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: typeof object.customer === "string" ? object.customer : null,
        stripe_event_id: event.id,
      },
    })
    .eq("provider", "stripe")
    .eq("provider_transaction_id", sessionId);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  if (!verifyStripeWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
  }

  try {
    const event = JSON.parse(rawBody) as StripeEvent;
    if (!event.id || !event.type || !event.data?.object) {
      return NextResponse.json({ error: "INVALID_EVENT" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("subscription_events")
      .select("id")
      .eq("provider", "stripe")
      .eq("provider_event_id", event.id)
      .maybeSingle();

    if (existing) return NextResponse.json({ received: true, duplicate: true });

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event);
        if (event.data.object.subscription) await handleSubscription(event);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscription(event);
        break;
      case "invoice.paid":
      case "invoice.payment_failed": {
        const object = event.data.object;
        const subscriptionId = typeof object.subscription === "string" ? object.subscription : null;
        if (subscriptionId) {
          const subscription = await stripeRequest<StripeSubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
          const syntheticEvent: StripeEvent = { ...event, data: { object: subscription as unknown as Record<string, unknown> } };
          await handleSubscription(syntheticEvent);
        }
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("billing.webhook", error);
    return NextResponse.json({ error: "WEBHOOK_PROCESSING_FAILED" }, { status: 500 });
  }
}
