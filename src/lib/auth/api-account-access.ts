import type { SupabaseClient } from "@supabase/supabase-js";
import { getAccountAccessState, nextRequiredSecurityStep } from "./account-access";

export type ApiAccountAccessResult =
  | { ok: true; state: Awaited<ReturnType<typeof getAccountAccessState>> }
  | {
      ok: false;
      status: 401 | 403 | 503;
      code: "UNAUTHENTICATED" | "MFA_REQUIRED" | "SECURITY_KEY_REQUIRED" | "SUBSCRIPTION_REQUIRED" | "IDENTITY_REQUIRED" | "ACCESS_CHECK_UNAVAILABLE";
      required?: "mfa" | "security-key" | "subscription" | "identity";
    };

export async function requireApiAccountAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<ApiAccountAccessResult> {
  let state: Awaited<ReturnType<typeof getAccountAccessState>>;
  try {
    state = await getAccountAccessState(supabase, userId);
  } catch (error) {
    console.error("[api-account-access] authorization lookup unavailable", error);
    return { ok: false, status: 503, code: "ACCESS_CHECK_UNAVAILABLE" };
  }
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
