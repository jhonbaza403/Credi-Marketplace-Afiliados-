import { PORTAL_DOMAINS } from "@/config/portal";

export interface NavigationItem {
  label: string;
  href: string;
  requiresAuth?: boolean;
  roles?: readonly string[];
}

/** Compatibility exports are derived from the canonical portal registry. */
export const PUBLIC_NAVIGATION = PORTAL_DOMAINS.filter((item) => !item.requiresAuth);
export const USER_NAVIGATION = PORTAL_DOMAINS.filter((item) => item.href.startsWith("/dashboard") && !item.roles);
export const AFFILIATE_NAVIGATION = PORTAL_DOMAINS.filter((item) => item.key === "affiliate" || item.href.startsWith("/dashboard/affiliate"));
export const SELLER_NAVIGATION = PORTAL_DOMAINS.filter((item) => item.roles?.includes("seller"));
export const ADMIN_NAVIGATION = PORTAL_DOMAINS.filter((item) => item.roles?.includes("admin"));
