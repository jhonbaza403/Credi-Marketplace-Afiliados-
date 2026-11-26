import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAccountAccessState, nextRequiredSecurityStep, type AccountAccessState } from "@/lib/auth/account-access";

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
  it("does not fabricate missing security requirements when the status lookup fails", async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST000", message: "database unavailable" },
      }),
    } as unknown as SupabaseClient;

    await expect(getAccountAccessState(supabase, "user-123"))
      .rejects.toThrow("ACCOUNT_ACCESS_LOOKUP_FAILED");
  });

  it("treats a missing access-status row as an unavailable security decision", async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as unknown as SupabaseClient;

    await expect(getAccountAccessState(supabase, "user-123"))
      .rejects.toThrow("ACCOUNT_ACCESS_STATUS_MISSING");
  });

});
