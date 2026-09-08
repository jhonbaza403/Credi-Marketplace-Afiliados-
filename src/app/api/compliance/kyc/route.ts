import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { complianceStatus, kycInputSchema } from "@/lib/compliance/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = kycInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos KYC inválidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { data: existing } = await supabase
    .from("kyc_cases")
    .select("id,status,country,document_type,created_at,updated_at")
    .eq("user_id", auth.user.id)
    .not("status", "in", "(rejected,expired)")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ case: existing, reused: true }, { status: 200 });
  }

  const { data: created, error } = await supabase
    .from("kyc_cases")
    .insert({
      user_id: auth.user.id,
      status: "submitted",
      country: parsed.data.country,
      document_type: parsed.data.documentType,
      submitted_at: new Date().toISOString(),
    })
    .select("id,status,country,document_type,submitted_at,created_at,updated_at")
    .single();

  if (error || !created) {
    return NextResponse.json(
      { error: "No fue posible crear el caso KYC", details: error?.message },
      { status: 500 },
    );
  }

  const admin = createAdminClient();
  const { error: checksError } = await admin.from("compliance_checks").insert(
    ["identity", "document", "liveness", "aml", "pep", "sanctions", "risk"].map(
      (checkType) => ({ subject_type: "kyc", subject_id: created.id, check_type: checkType, status: "pending" }),
    ),
  );

  const { error: eventError } = await admin.from("compliance_events").insert({
    subject_type: "kyc",
    subject_id: created.id,
    actor_id: auth.user.id,
    event_type: "case_submitted",
    previous_status: "not_started",
    new_status: "submitted",
  });

  if (checksError || eventError) {
    return NextResponse.json(
      { error: "Caso creado, pero no se pudo completar el registro de cumplimiento", details: checksError?.message ?? eventError?.message },
      { status: 500 },
    );
  }

  complianceStatus.parse(created.status);
  return NextResponse.json({ case: created }, { status: 201 });
}
