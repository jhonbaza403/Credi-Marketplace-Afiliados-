import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const [{ data: kyc }, { data: kyb }] = await Promise.all([
    supabase.from("kyc_cases").select("id,status,country,document_type,submitted_at,reviewed_at,updated_at").eq("user_id", auth.user.id).not("status", "in", "(rejected,expired)").maybeSingle(),
    supabase.from("kyb_cases").select("id,status,legal_name,trade_name,country,submitted_at,reviewed_at,updated_at").eq("user_id", auth.user.id).not("status", "in", "(rejected,expired)").maybeSingle(),
  ]);

  return NextResponse.json({ kyc: kyc ?? null, kyb: kyb ?? null });
}
