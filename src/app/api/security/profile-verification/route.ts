import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSameOrigin } from "@/lib/security/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const ROLES = ["front", "left", "right"] as const;

function extensionFor(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function errorResponse(error: string, status: number, code: string) {
  return NextResponse.json(
    { success: false, error, code },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();

  if (authError || !auth.user) {
    return errorResponse("Debes iniciar sesión.", 401, "UNAUTHENTICATED");
  }

  const { data, error } = await supabase
    .from("profile_verification_photos")
    .select("user_id,status,created_at,updated_at,rejection_reason")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) {
    console.error("[identity-profile-photos] status failed", error);
    return errorResponse("No fue posible consultar el estado de las fotografías.", 500, "IDENTITY_PHOTO_STATUS_FAILED");
  }

  return NextResponse.json(
    { success: true, verification: data ?? { user_id: auth.user.id, status: "not_submitted" } },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return errorResponse("Origen no autorizado.", 403, "CSRF_VALIDATION_FAILED");
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();

  if (authError || !auth.user) {
    return errorResponse("Debes iniciar sesión.", 401, "UNAUTHENTICATED");
  }

  const form = await request.formData();
  const files = {
    front: form.get("front"),
    left: form.get("left"),
    right: form.get("right"),
  };

  for (const role of ROLES) {
    const file = files[role];
    if (!(file instanceof File)) {
      return errorResponse(`Falta la fotografía ${role}.`, 400, "IDENTITY_PHOTO_MISSING");
    }
    if (file.size <= 0 || file.size > MAX_BYTES || !ALLOWED_MIME.has(file.type)) {
      return errorResponse(
        "Cada fotografía debe ser JPG, PNG o WEBP y no superar 15 MB.",
        400,
        "IDENTITY_PHOTO_INVALID",
      );
    }
  }

  const admin = createAdminClient();
  const uploaded: string[] = [];

  try {
    const payload: Record<string, string> = {};

    for (const role of ROLES) {
      const file = files[role] as File;
      const buffer = Buffer.from(await file.arrayBuffer());
      const checksum = createHash("sha256").update(buffer).digest("hex");
      const objectPath = `${auth.user.id}/profile/${role}/${randomUUID()}.${extensionFor(file.type)}`;

      const { error: uploadError } = await admin.storage
        .from("identity-profile-private")
        .upload(objectPath, buffer, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw new Error(`IDENTITY_PHOTO_UPLOAD_${role.toUpperCase()}:${uploadError.message}`);

      uploaded.push(objectPath);
      payload[`${role}_path`] = objectPath;
      payload[`${role}_checksum`] = checksum;
    }

    const { data: row, error: dbError } = await admin
      .from("profile_verification_photos")
      .upsert(
        {
          user_id: auth.user.id,
          front_path: payload.front_path,
          left_path: payload.left_path,
          right_path: payload.right_path,
          status: "submitted",
          rejection_reason: null,
          reviewed_by: null,
          reviewed_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("user_id,status,front_path,left_path,right_path,created_at,updated_at")
      .single();

    if (dbError || !row) {
      throw new Error(dbError?.message || "IDENTITY_PHOTO_RECORD_FAILED");
    }

    return NextResponse.json(
      {
        success: true,
        verification: {
          userId: row.user_id,
          status: row.status,
          submitted: true,
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    await admin.storage.from("identity-profile-private").remove(uploaded);
    console.error("[identity-profile-photos] failed", error);
    return errorResponse(
      "No fue posible registrar las fotografías de verificación.",
      500,
      "IDENTITY_PHOTO_SUBMISSION_FAILED",
    );
  }
}
