import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return NextResponse.json({ authenticated: false, subscription: null }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("current_user_plan");

    if (error) {
      console.error("billing.current_user_plan", error);
      return NextResponse.json(
        { authenticated: true, subscription: null, code: "BILLING_NOT_READY" },
        { status: 503 },
      );
    }

    return NextResponse.json({ authenticated: true, subscription: data?.[0] ?? null });
  } catch (error) {
    console.error("billing.subscription", error);
    return NextResponse.json({ code: "BILLING_UNAVAILABLE" }, { status: 503 });
  }
}
