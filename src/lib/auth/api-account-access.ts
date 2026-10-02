import type { SupabaseClient } from "@supabase/supabase-js";
import { getAccountAccessState, nextRequiredSecurityStep } from "./account-access";

export type ApiAccountAccessResult =
  | { ok: true; state: Awaited<ReturnType<typeof getAccountAccessState>> }
  | {
      ok: false;
      status: 401 | 403;
      code: "UNAUTHENTICATED" | "MFA_REQUIRED" | "SECURITY_KEY_REQUIRED" | "SUBSCRIPTION_REQUIRED" | "IDENTITY_REQUIRED";
      required: "mfa" | "security-key" | "subscription" | "identity";
    };

export async function requireApiAccountAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<ApiAccountAccessResult> {
  const state = await getAccountAccessState(supabase, userId);
  const required = nextRequiredSecurityStep(state);

  if (!required) return { ok: true, state };

  if (required === "mfa") {
    return { ok: false, status: 403, code: "MFA_REQUIRED", required };
  }

  if (required === "security-key") {
    return { ok: false, status: 403, code: "SECURITY_KEY_REQUIRED", required };
  }

  if (required === "subscription") {
    return { ok: false, status: 403, code: "SUBSCRIPTION_REQUIRED", required };
  }

  return { ok: false, status: 403, code: "IDENTITY_REQUIRED", required };
}
