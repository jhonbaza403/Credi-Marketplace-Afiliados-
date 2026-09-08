import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const userSupabase = await createClient();
  const { data: auth } = await userSupabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const url = new URL(request.url);
  const caseType = url.searchParams.get("caseType");
  const caseId = url.searchParams.get("caseId");
  const documentId = url.searchParams.get("documentId");

  if ((caseType !== "kyc" && caseType !== "kyb") || !caseId || !documentId) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const caseTable = caseType === "kyc" ? "kyc_cases" : "kyb_cases";
  const documentTable = caseType === "kyc" ? "kyc_documents" : "kyb_documents";
  const { data: profile } = await userSupabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
  const admin = profile?.role === "admin";

  const caseQuery = userSupabase.from(caseTable).select("id,user_id").eq("id", caseId);
  if (!admin) caseQuery.eq("user_id", auth.user.id);
  const { data: caseRow } = await caseQuery.maybeSingle();
  if (!caseRow) return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });

  const adminClient = createAdminClient();
  const { data: doc } = await adminClient.from(documentTable).select("id,storage_path").eq("id", documentId).eq("case_id", caseId).maybeSingle();
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const bucket = caseType === "kyc" ? "kyc-documents" : "kyb-documents";
  const { data: signed, error } = await adminClient.storage.from(bucket).createSignedUrl(doc.storage_path, 300);
  if (error || !signed?.signedUrl) return NextResponse.json({ error: "No se pudo generar el acceso temporal", details: error?.message }, { status: 500 });

  return NextResponse.json({ url: signed.signedUrl, expiresIn: 300 });
}
