import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSameOrigin } from "@/lib/security/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: string, status: number, code: string) {
  return NextResponse.json(
    { success: false, error, code },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return errorResponse("Origen no autorizado.", 403, "CSRF_VALIDATION_FAILED");
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();

  if (authError) {
    return errorResponse("No fue posible verificar la sesión.", 401, "AUTHENTICATION_ERROR");
  }

  const user = auth.user;
  if (!user) return errorResponse("Debes iniciar sesión.", 401, "UNAUTHENTICATED");

  try {
    const admin = createAdminClient();
    const { data: passkeys, error: passkeyError } =
      await admin.auth.admin.passkey.listPasskeys({ userId: user.id });

    if (passkeyError) {
      console.error("[security-passkey-sync] list failed", passkeyError);
      return errorResponse("No fue posible comprobar la llave de seguridad.", 502, "PASSKEY_LOOKUP_FAILED");
    }

    const enrolled = Array.isArray(passkeys) && passkeys.length > 0;
    const currentMetadata =
      user.app_metadata && typeof user.app_metadata === "object"
        ? user.app_metadata
        : {};

    const nextMetadata = {
      ...currentMetadata,
      security_key_enrolled: enrolled,
      security_key_synced_at: new Date().toISOString(),
    };

    const { data: updatedUser, error: updateError } =
      await admin.auth.admin.updateUserById(user.id, {
        app_metadata: nextMetadata,
      });

    if (updateError) {
      console.error("[security-passkey-sync] metadata update failed", updateError);
      return errorResponse("No fue posible actualizar el estado de seguridad.", 500, "PASSKEY_STATE_UPDATE_FAILED");
    }

    return NextResponse.json(
      {
        success: true,
        securityKeyEnrolled: enrolled,
        passkeyCount: Array.isArray(passkeys) ? passkeys.length : 0,
        userId: updatedUser.user.id,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[security-passkey-sync] unexpected", error);
    return errorResponse("No fue posible sincronizar la llave de seguridad.", 500, "PASSKEY_SYNC_FAILED");
  }
}
