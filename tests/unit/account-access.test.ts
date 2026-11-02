import { describe, expect, it } from "vitest";
import { getAccountAccessState, nextRequiredSecurityStep, type AccountAccessState } from "@/lib/auth/account-access";
import type { SupabaseClient } from "@supabase/supabase-js";

const base: AccountAccessState = {
  is_platform_owner: false,
  is_admin: false,
  has_active_subscription: false,
  has_mfa: false,
  has_security_key: false,
  has_profile_photos: false,
  identity_approved: false,
};

describe("account access security gate", () => {
  it("fails explicitly when the authorization RPC is unavailable instead of returning an empty account", async () => {
    const supabase = {
      rpc: async () => ({ data: null, error: { message: "database unavailable" } }),
    } as unknown as SupabaseClient;

    await expect(getAccountAccessState(supabase, "00000000-0000-4000-8000-000000000001"))
      .rejects.toThrow("ACCOUNT_ACCESS_LOOKUP_FAILED");
  });

  it("requires MFA before every other onboarding requirement", () => {
    expect(nextRequiredSecurityStep(base)).toBe("mfa");
  });

  it("requires the security key after MFA", () => {
    expect(nextRequiredSecurityStep({ ...base, has_mfa: true })).toBe("security-key");
  });

  it("requires an explicit plan after MFA and key enrollment", () => {
    expect(
      nextRequiredSecurityStep({
        ...base,
        has_mfa: true,
        has_security_key: true,
      }),
    ).toBe("subscription");
  });

  it("requires identity completion after a valid plan", () => {
    expect(
      nextRequiredSecurityStep({
        ...base,
        has_mfa: true,
        has_security_key: true,
        has_active_subscription: true,
      }),
    ).toBe("identity");
  });

  it("allows the platform owner past the commercial-plan gate", () => {
    expect(
      nextRequiredSecurityStep({
        ...base,
        has_mfa: true,
        has_security_key: true,
        is_platform_owner: true,
        has_profile_photos: true,
        identity_approved: true,
      }),
    ).toBeNull();
  });

  it("allows a fully enrolled subscribed account", () => {
    expect(
      nextRequiredSecurityStep({
        ...base,
        has_mfa: true,
        has_security_key: true,
        has_active_subscription: true,
        has_profile_photos: true,
        identity_approved: true,
      }),
    ).toBeNull();
  });
});
