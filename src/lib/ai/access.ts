export type AiAccessLookupResult = {
  data: unknown;
  error: { code?: string; message?: string } | null;
};

export type AiAccessDecision =
  | { allowed: true; source: "platform_owner" | "commercial_subscription" }
  | {
      allowed: false;
      reason:
        | "platform_owner_lookup_failed"
        | "entitlement_lookup_failed"
        | "subscription_required";
      errorCode?: string;
    };

function hasEnabledEntitlement(value: unknown): boolean {
  const rows = Array.isArray(value) ? value : value && typeof value === "object" ? [value] : [];
  return rows.some(
    (row) =>
      row !== null &&
      typeof row === "object" &&
      (row as Record<string, unknown>).enabled === true,
  );
}

/**
 * Keeps platform ownership separate from commercial subscriptions.
 * An owner never needs a paid-plan entitlement; all other users do.
 * Lookup failures are distinct from a genuine missing subscription.
 */
export async function resolveCrediAiAccess(lookups: {
  isPlatformOwner: () => Promise<AiAccessLookupResult>;
  getAiEntitlement: () => Promise<AiAccessLookupResult>;
}): Promise<AiAccessDecision> {
  const owner = await lookups.isPlatformOwner();

  if (owner.error) {
    return {
      allowed: false,
      reason: "platform_owner_lookup_failed",
      errorCode: owner.error.code,
    };
  }

  if (owner.data === true) {
    return { allowed: true, source: "platform_owner" };
  }

  const entitlement = await lookups.getAiEntitlement();

  if (entitlement.error) {
    return {
      allowed: false,
      reason: "entitlement_lookup_failed",
      errorCode: entitlement.error.code,
    };
  }

  return hasEnabledEntitlement(entitlement.data)
    ? { allowed: true, source: "commercial_subscription" }
    : { allowed: false, reason: "subscription_required" };
}
