import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { complianceStatus } from "@/lib/compliance/validation";

export const runtime = "nodejs";

const DECISIONS = new Set(["approved", "rejected", "additional_information", "suspended"]);

async function requireAdmin() {
  const userClient = await createClient();
  const { data: auth } = await userClient.auth.getUser();
  if (!auth.user) return { userClient, user: null, admin: false };

  const { data: profile } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  return { userClient, user: auth.user, admin: profile?.role === "admin" };
}

export async function GET() {
  const { user, admin } = await requireAdmin();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!admin) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const supabase = createAdminClient();
  const [{ data: kyc }, { data: kyb }] = await Promise.all([
    supabase.from("kyc_cases").select("id,user_id,status,country,document_type,provider,created_at,updated_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("kyb_cases").select("id,user_id,status,legal_name,trade_name,tax_id,registration_number,country,created_at,updated_at").order("created_at", { ascending: false }).limit(100),
  ]);

  return NextResponse.json({ kyc: kyc ?? [], kyb: kyb ?? [] });
}

export async function PATCH(request: Request) {
  const { user, admin } = await requireAdmin();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!admin) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    subjectType?: "kyc" | "kyb";
    subjectId?: string;
    decision?: string;
    reason?: string;
    notes?: string;
  } | null;

  if (!body?.subjectType || !body.subjectId || !body.decision || !DECISIONS.has(body.decision) || !body.reason?.trim()) {
    return NextResponse.json({ error: "Decisión inválida" }, { status: 400 });
  }

  const table = body.subjectType === "kyc" ? "kyc_cases" : "kyb_cases";
  const supabase = createAdminClient();
  const { data: current, error: currentError } = await supabase
    .from(table)
    .select("id,status")
    .eq("id", body.subjectId)
    .maybeSingle();

  if (currentError || !current) {
    return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
  }

  const nextStatus = body.decision as "approved" | "rejected" | "additional_information" | "suspended";
  complianceStatus.parse(nextStatus);

  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    status: nextStatus,
    review_reason: body.reason.trim(),
    reviewed_at: now,
  };
  if (nextStatus === "rejected") update.rejection_reason = body.reason.trim();

  const { data: updated, error: updateError } = await supabase
    .from(table)
    .update(update)
    .eq("id", body.subjectId)
    .select("id,status,review_reason,rejection_reason,reviewed_at,updated_at")
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "No fue posible actualizar el caso", details: updateError?.message }, { status: 500 });
  }

  const { error: reviewError } = await supabase.from("compliance_reviews").insert({
    subject_type: body.subjectType,
    subject_id: body.subjectId,
    reviewer_id: user.id,
    decision: nextStatus,
    reason: body.reason.trim(),
    notes: body.notes?.trim() || null,
  });

  if (reviewError) {
    return NextResponse.json({ error: "Caso actualizado, pero falló el registro de revisión", details: reviewError.message }, { status: 500 });
  }

  await supabase.from("compliance_events").insert({
    subject_type: body.subjectType,
    subject_id: body.subjectId,
    actor_id: user.id,
    event_type: "manual_review",
    previous_status: current.status,
    new_status: nextStatus,
    reason: body.reason.trim(),
    metadata: { notes: body.notes?.trim() || null },
  });

  return NextResponse.json({ case: updated });
}
