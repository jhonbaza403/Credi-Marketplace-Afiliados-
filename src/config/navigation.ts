import { PORTAL_DOMAINS, type PortalDomain } from "@/config/portal";

/** Compatibility type backed by the canonical portal registry. */
export type NavigationItem = Pick<
  PortalDomain,
  "label" | "href" | "requiresAuth" | "roles"
>;

/** Public and authenticated navigation are derived from one source of truth. */
export const PUBLIC_NAVIGATION = PORTAL_DOMAINS.filter((item) => !item.requiresAuth);
export const USER_NAVIGATION = PORTAL_DOMAINS.filter(
  (item) => item.href.startsWith("/dashboard") && !item.roles,
);
export const AFFILIATE_NAVIGATION = PORTAL_DOMAINS.filter(
  (item) => item.key === "affiliate" || item.href.startsWith("/dashboard/affiliate"),
);

/** The database role is `vendor`; "seller" is a product label, not an RBAC value. */
export const SELLER_NAVIGATION = PORTAL_DOMAINS.filter(
  (item) => item.roles?.includes("vendor"),
);
export const ADMIN_NAVIGATION = PORTAL_DOMAINS.filter(
  (item) => item.roles?.includes("admin"),
);
