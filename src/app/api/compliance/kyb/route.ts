import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { kybInputSchema } from "@/lib/compliance/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = kybInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos KYB inválidos", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("kyb_cases")
    .select("id,status,legal_name,trade_name,tax_id,registration_number,country,legal_address,business_activity,created_at,updated_at")
    .eq("user_id", auth.user.id)
    .not("status", "in", "(rejected,expired)")
    .maybeSingle();

  if (existing) return NextResponse.json({ case: existing, reused: true }, { status: 200 });

  const { data: created, error } = await supabase
    .from("kyb_cases")
    .insert({
      user_id: auth.user.id,
      status: "submitted",
      legal_name: parsed.data.legalName,
      trade_name: parsed.data.tradeName || null,
      tax_id: parsed.data.taxId,
      registration_number: parsed.data.registrationNumber,
      country: parsed.data.country,
      legal_address: parsed.data.legalAddress,
      business_activity: parsed.data.businessActivity,
      submitted_at: new Date().toISOString(),
    })
    .select("id,status,legal_name,trade_name,tax_id,registration_number,country,legal_address,business_activity,submitted_at,created_at,updated_at")
    .single();

  if (error || !created) {
    return NextResponse.json({ error: "No fue posible crear el caso KYB", details: error?.message }, { status: 500 });
  }

  const { error: uboError } = await supabase.from("kyb_ubo").insert(
    parsed.data.ubos.map((ubo) => ({
      case_id: created.id,
      full_name: ubo.fullName,
      ownership_percent: ubo.ownershipPercent,
      role_title: ubo.roleTitle || null,
      country: ubo.country,
    })),
  );

  if (uboError) {
    return NextResponse.json({ error: "El caso KYB fue creado, pero no se pudieron guardar los UBO", details: uboError.message }, { status: 500 });
  }

  const admin = createAdminClient();
  const { error: checksError } = await admin.from("compliance_checks").insert(
    ["business_registry", "ubo", "aml", "pep", "sanctions", "risk"].map((checkType) => ({
      subject_type: "kyb",
      subject_id: created.id,
      check_type: checkType,
      status: "pending",
    })),
  );

  const { error: eventError } = await admin.from("compliance_events").insert({
    subject_type: "kyb",
    subject_id: created.id,
    actor_id: auth.user.id,
    event_type: "case_submitted",
    previous_status: "not_started",
    new_status: "submitted",
  });

  if (checksError || eventError) {
    return NextResponse.json({ error: "Caso creado, pero no se pudo completar el registro de cumplimiento", details: checksError?.message ?? eventError?.message }, { status: 500 });
  }

  return NextResponse.json({ case: created }, { status: 201 });
}
