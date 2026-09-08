import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { documentUploadMetaSchema } from "@/lib/compliance/validation";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const KYC_TYPES = new Set(["id_front", "id_back", "passport", "drivers_license", "selfie", "address_proof", "other"]);
const KYB_TYPES = new Set(["incorporation", "bylaws", "tax_certificate", "registry_extract", "proof_of_address", "other"]);
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function safeName(name: string) {
  const ext = name.toLowerCase().split(".").pop() || "bin";
  return ext.replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const meta = documentUploadMetaSchema.safeParse({
    caseType: form.get("caseType"),
    caseId: form.get("caseId"),
    documentType: form.get("documentType"),
  });

  if (!meta.success || !(file instanceof File)) {
    return NextResponse.json({ error: "Archivo o metadatos inválidos" }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_BYTES || !ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Archivo no permitido. Máximo 10 MB y formatos JPG, PNG, WEBP o PDF." }, { status: 400 });
  }

  const isKyc = meta.data.caseType === "kyc";
  const validTypes = isKyc ? KYC_TYPES : KYB_TYPES;
  if (!validTypes.has(meta.data.documentType)) {
    return NextResponse.json({ error: "Tipo de documento no permitido" }, { status: 400 });
  }

  const table = isKyc ? "kyc_cases" : "kyb_cases";
  const { data: caseRow } = await supabase
    .from(table)
    .select("id")
    .eq("id", meta.data.caseId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!caseRow) {
    return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const objectPath = `${auth.user.id}/${meta.data.caseId}/${meta.data.documentType}/${randomUUID()}.${safeName(file.name)}`;
  const bucket = isKyc ? "kyc-documents" : "kyb-documents";
  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage.from(bucket).upload(objectPath, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    return NextResponse.json({ error: "No fue posible almacenar el documento", details: uploadError.message }, { status: 500 });
  }

  const { data: document, error: dbError } = await admin
    .from(isKyc ? "kyc_documents" : "kyb_documents")
    .insert({
      case_id: meta.data.caseId,
      document_type: meta.data.documentType,
      storage_path: objectPath,
      mime_type: file.type,
      size_bytes: file.size,
      checksum,
    })
    .select("id,document_type,storage_path,mime_type,size_bytes,created_at")
    .single();

  if (dbError || !document) {
    await admin.storage.from(bucket).remove([objectPath]);
    return NextResponse.json({ error: "No fue posible registrar el documento", details: dbError?.message }, { status: 500 });
  }

  return NextResponse.json({ document }, { status: 201 });
}
