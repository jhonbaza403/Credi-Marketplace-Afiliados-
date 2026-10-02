import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSameOrigin } from "@/lib/security/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://credi-marketplace-afiliados.vercel.app").replace(/\/$/, "");
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origen no autorizado.", code: "CSRF_VALIDATION_FAILED" }, { status: 403 });
  }

  try {
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      return NextResponse.redirect(new URL("/login?next=/pricing", appUrl()), 303);
    }

    const admin = createAdminClient();
    const [{ data: freePlan, error: planError }, { data: profile }] = await Promise.all([
      admin.from("plans").select("id,code,is_free,is_active").eq("code", "free").eq("is_active", true).maybeSingle(),
      admin.from("profiles").select("platform_owner,role").eq("id", auth.user.id).maybeSingle(),
    ]);

    if (planError || !freePlan || !freePlan.is_free) {
      return NextResponse.json({ error: "El plan Free no está disponible.", code: "FREE_PLAN_NOT_AVAILABLE" }, { status: 409 });
    }

    const isPrivileged = Boolean(profile?.platform_owner) || profile?.role === "admin";
    if (isPrivileged) {
      return NextResponse.redirect(new URL("/security?required=mfa", appUrl()), 303);
    }

    const { data: existing } = await admin
      .from("subscriptions")
      .select("id,status,plan_id")
      .eq("user_id", auth.user.id)
      .in("status", ["trialing", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existing) {
      const { error: insertError } = await admin.from("subscriptions").insert({
        user_id: auth.user.id,
        plan_id: freePlan.id,
        status: "active",
        billing_interval: "free",
        started_at: new Date().toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: null,
        provider: "credi",
        metadata: { activation: "self_service_free_plan" },
      });

      if (insertError) {
        console.error("[billing.activate-free] insert failed", insertError);
        return NextResponse.json({ error: "No fue posible activar el plan.", code: "FREE_PLAN_ACTIVATION_FAILED" }, { status: 500 });
      }
    }

    return NextResponse.redirect(new URL("/security?required=mfa&next=/dashboard", appUrl()), 303);
  } catch (error) {
    console.error("[billing.activate-free] unexpected", error);
    return NextResponse.json({ error: "No fue posible activar el plan.", code: "FREE_PLAN_ACTIVATION_UNAVAILABLE" }, { status: 503 });
  }
}
