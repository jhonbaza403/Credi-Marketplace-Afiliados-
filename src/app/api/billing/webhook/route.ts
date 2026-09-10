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

function objectMetadata(object: Record<string, unknown>): Record<string, string> {
  const value = object.metadata;
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

async function upsertSubscription(event: StripeEvent, subscriptionOverride?: StripeSubscription) {
  const object = event.data.object;
  const subscriptionId = String(object.id ?? subscriptionOverride?.id ?? "");
  if (!subscriptionId) return null;

  let subscription = subscriptionOverride ?? (object as unknown as StripeSubscription);
  if (!subscription.items) {
    subscription = await stripeRequest<StripeSubscription>(
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    );
  }

  const metadata = subscription.metadata ?? objectMetadata(object);
  const userId = metadata.user_id;
  const planId = metadata.plan_id;
  const providerCustomerId = typeof subscription.customer === "string" ? subscription.customer : null;
  if (!userId || !planId) {
    console.warn("billing.webhook.subscription_missing_metadata", event.id, subscriptionId);
    return null;
  }

  const admin = createAdminClient();
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
    .select("id,user_id,plan_id")
    .maybeSingle();

  if (upsertError) throw upsertError;

  if (localSubscription) {
    const { error: eventError } = await admin.from("subscription_events").insert({
      subscription_id: localSubscription.id,
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
        .eq("subscription_id", localSubscription.id)
        .eq("provider", "stripe")
        .in("status", ["pending", "paid"]);
    }
  }

  return localSubscription;
}

async function handleCheckoutCompleted(event: StripeEvent) {
  const object = event.data.object;
  const sessionId = String(object.id ?? "");
  const metadata = objectMetadata(object);
  const subscriptionId = typeof object.subscription === "string" ? object.subscription : null;
  const userId = metadata.user_id;
  if (!sessionId || !userId) return;

  const admin = createAdminClient();
  const checkoutMetadata = {
    ...metadata,
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: typeof object.customer === "string" ? object.customer : null,
    stripe_event_id: event.id,
  };

  await admin
    .from("checkout_intents")
    .update({
      status: "completed",
      updated_at: new Date().toISOString(),
      metadata: checkoutMetadata,
    })
    .eq("provider", "stripe")
    .eq("provider_checkout_id", sessionId);

  await admin
    .from("billing_transactions")
    .update({
      metadata: checkoutMetadata,
    })
    .eq("provider", "stripe")
    .eq("provider_transaction_id", sessionId)
    .eq("user_id", userId);
}

async function handleInvoiceEvent(event: StripeEvent) {
  const object = event.data.object;
  const subscriptionId = typeof object.subscription === "string" ? object.subscription : null;
  if (!subscriptionId) return;

  const subscription = await stripeRequest<StripeSubscription>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
  );
  const localSubscription = await upsertSubscription(event, subscription);
  if (!localSubscription) return;

  const status = event.type === "invoice.paid" ? "paid" : "failed";
  const admin = createAdminClient();
  const metadata = subscription.metadata ?? {};
  const invoiceMetadata = {
    ...metadata,
    stripe_subscription_id: subscriptionId,
    stripe_event_id: event.id,
    stripe_invoice_id: typeof object.id === "string" ? object.id : null,
  };

  await admin
    .from("billing_transactions")
    .update({
      subscription_id: localSubscription.id,
      status,
      paid_at: status === "paid" ? new Date().toISOString() : null,
      metadata: invoiceMetadata,
    })
    .eq("provider", "stripe")
    .eq("user_id", localSubscription.user_id)
    .eq("type", "subscription")
    .in("status", ["pending", "failed"]);

  if (status === "paid") {
    await admin
      .from("platform_revenue")
      .insert({
        source_type: "subscription",
        source_id: localSubscription.id,
        amount_minor: Number(object.amount_paid ?? 0),
        currency: String(object.currency ?? "usd").toUpperCase(),
        status: "recognized",
        description: `Suscripción Credi Marketplace ${metadata.plan_code ?? ""}`.trim(),
        metadata: invoiceMetadata,
        recognized_at: new Date().toISOString(),
      });
  }
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
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await upsertSubscription(event);
        break;
      case "invoice.paid":
      case "invoice.payment_failed":
        await handleInvoiceEvent(event);
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("billing.webhook", error);
    return NextResponse.json({ error: "WEBHOOK_PROCESSING_FAILED" }, { status: 500 });
  }
}
