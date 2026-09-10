import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { stripeRequest, type StripeCheckoutSession } from "@/lib/billing/stripe";

const PLAN_CODES = new Set(["creator", "business", "enterprise"]);
const INTERVALS = new Set(["monthly", "yearly"]);

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://credi-marketplace-afiliados.vercel.app").replace(/\/$/, "");
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.redirect(new URL("/login", appUrl()), 303);

    const form = await request.formData();
    const planCode = String(form.get("plan") ?? "");
    const interval = String(form.get("interval") ?? "monthly");

    if (!PLAN_CODES.has(planCode) || !INTERVALS.has(interval)) {
      return NextResponse.json({ error: "PLAN_OR_INTERVAL_INVALID" }, { status: 400 });
    }

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select(
        "id,code,name,description,monthly_price_minor,yearly_price_minor,currency,is_free,is_active,is_public,stripe_product_id,stripe_monthly_price_id,stripe_yearly_price_id",
      )
      .eq("code", planCode)
      .eq("is_active", true)
      .eq("is_public", true)
      .maybeSingle();

    if (planError || !plan || plan.is_free) {
      return NextResponse.json({ error: "PLAN_NOT_AVAILABLE" }, { status: 404 });
    }

    const amount = interval === "yearly" ? plan.yearly_price_minor : plan.monthly_price_minor;
    const priceId = interval === "yearly" ? plan.stripe_yearly_price_id : plan.stripe_monthly_price_id;

    if (!Number.isInteger(amount) || amount <= 0 || !priceId) {
      return NextResponse.json({ error: "PLAN_PRICE_NOT_CONFIGURED" }, { status: 409 });
    }

    const customerEmail = auth.user.email ?? undefined;
    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("success_url", `${appUrl()}/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${appUrl()}/pricing?checkout=cancelled`);
    params.set("submit_type", "subscribe");
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("customer_creation", "always");
    if (customerEmail) params.set("customer_email", customerEmail);
    params.set("client_reference_id", auth.user.id);
    params.set("metadata[user_id]", auth.user.id);
    params.set("metadata[plan_code]", plan.code);
    params.set("metadata[billing_interval]", interval);
    params.set("metadata[plan_id]", plan.id);
    params.set("subscription_data[metadata][user_id]", auth.user.id);
    params.set("subscription_data[metadata][plan_code]", plan.code);
    params.set("subscription_data[metadata][billing_interval]", interval);
    params.set("subscription_data[metadata][plan_id]", plan.id);

    const session = await stripeRequest<StripeCheckoutSession>("/checkout/sessions", {
      method: "POST",
      body: params,
    });

    if (!session.url) {
      return NextResponse.json({ error: "CHECKOUT_URL_MISSING" }, { status: 502 });
    }

    const admin = createAdminClient();

    await admin.from("checkout_intents").insert({
      user_id: auth.user.id,
      plan_id: plan.id,
      type: "subscription",
      billing_interval: interval,
      amount_minor: amount,
      currency: plan.currency,
      provider: "stripe",
      provider_checkout_id: session.id,
      status: "pending",
      metadata: {
        plan_code: plan.code,
        stripe_price_id: priceId,
      },
    });

    await admin.from("billing_transactions").insert({
      user_id: auth.user.id,
      type: "subscription",
      status: "pending",
      amount_minor: amount,
      currency: plan.currency,
      provider: "stripe",
      provider_transaction_id: session.id,
      description: `Suscripción ${plan.name} (${interval})`,
      metadata: {
        plan_code: plan.code,
        billing_interval: interval,
        plan_id: plan.id,
        stripe_price_id: priceId,
      },
    });

    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    console.error("billing.checkout", error);
    return NextResponse.json({ error: "CHECKOUT_UNAVAILABLE" }, { status: 503 });
  }
}
