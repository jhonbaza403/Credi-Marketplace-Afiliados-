import { describe, expect, it, vi } from "vitest";
import { resolveCrediAiAccess } from "@/lib/ai/access";

describe("Credi AI entitlement access", () => {
  it("allows the platform owner without querying a commercial subscription", async () => {
    const getAiEntitlement = vi.fn();

    const result = await resolveCrediAiAccess({
      isPlatformOwner: async () => ({ data: true, error: null }),
      getAiEntitlement,
    });

    expect(result).toEqual({ allowed: true, source: "platform_owner" });
    expect(getAiEntitlement).not.toHaveBeenCalled();
  });

  it("allows a non-owner only when the commercial entitlement is enabled", async () => {
    const result = await resolveCrediAiAccess({
      isPlatformOwner: async () => ({ data: false, error: null }),
      getAiEntitlement: async () => ({
        data: [{ enabled: true, plan_code: "business" }],
        error: null,
      }),
    });

    expect(result).toEqual({ allowed: true, source: "commercial_subscription" });
  });

  it("rejects a non-owner without an enabled AI entitlement", async () => {
    const result = await resolveCrediAiAccess({
      isPlatformOwner: async () => ({ data: false, error: null }),
      getAiEntitlement: async () => ({ data: [], error: null }),
    });

    expect(result).toEqual({ allowed: false, reason: "subscription_required" });
  });

  it("supports a single-row entitlement response", async () => {
    const result = await resolveCrediAiAccess({
      isPlatformOwner: async () => ({ data: false, error: null }),
      getAiEntitlement: async () => ({ data: { enabled: true }, error: null }),
    });

    expect(result.allowed).toBe(true);
  });

  it("fails closed when the platform-owner lookup fails", async () => {
    const getAiEntitlement = vi.fn();

    const result = await resolveCrediAiAccess({
      isPlatformOwner: async () => ({
        data: null,
        error: { code: "42501", message: "permission denied" },
      }),
      getAiEntitlement,
    });

    expect(result).toEqual({
      allowed: false,
      reason: "platform_owner_lookup_failed",
      errorCode: "42501",
    });
    expect(getAiEntitlement).not.toHaveBeenCalled();
  });

  it("does not mislabel an entitlement database error as a missing subscription", async () => {
    const result = await resolveCrediAiAccess({
      isPlatformOwner: async () => ({ data: false, error: null }),
      getAiEntitlement: async () => ({
        data: null,
        error: { code: "42P01", message: "relation does not exist" },
      }),
    });

    expect(result).toEqual({
      allowed: false,
      reason: "entitlement_lookup_failed",
      errorCode: "42P01",
    });
  });
});
