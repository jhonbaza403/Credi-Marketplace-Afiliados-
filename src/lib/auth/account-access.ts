import type { SupabaseClient } from "@supabase/supabase-js";

export type AccountAccessState = {
  is_platform_owner: boolean;
  is_admin: boolean;
  has_active_subscription: boolean;
  has_mfa: boolean;
  has_security_key: boolean;
  has_profile_photos: boolean;
  identity_approved: boolean;
};

export async function getAccountAccessState(
  supabase: SupabaseClient,
  userId: string,
): Promise<AccountAccessState> {
  const { data, error } = await supabase.rpc("credi_account_security_status", {
    p_user_id: userId,
  });

  if (error) {
    // A failed authorization lookup is not an empty account state.
    // Callers must fail closed with a service error, never invent MFA/subscription requirements.
    console.error("[account-access] status lookup failed", error);
    throw new Error("ACCOUNT_ACCESS_LOOKUP_FAILED");
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    // Missing authorization state is not proof that the account needs MFA.
    throw new Error("ACCOUNT_ACCESS_STATE_MISSING");
  }

  const value = row as Record<string, unknown>;
  return {
    is_platform_owner: value.is_platform_owner === true,
    is_admin: value.is_admin === true,
    has_active_subscription: value.has_active_subscription === true,
    has_mfa: value.has_mfa === true,
    has_security_key: value.has_security_key === true,
    has_profile_photos: value.has_profile_photos === true,
    identity_approved: value.identity_approved === true,
  };
}

export function nextRequiredSecurityStep(state: AccountAccessState): "mfa" | "security-key" | "subscription" | "identity" | null {
  // Platform administrators authenticate with their normal account credentials.
  // Do not force passkey/security-key enrollment for admin access.
  if (!state.is_admin && !state.is_platform_owner) {
    if (!state.has_mfa) return "mfa";
    if (!state.has_security_key) return "security-key";
  }
  if (!state.has_active_subscription && !state.is_platform_owner && !state.is_admin) return "subscription";
  if (!state.is_admin && !state.is_platform_owner && (!state.has_profile_photos || !state.identity_approved)) return "identity";
  return null;
}
