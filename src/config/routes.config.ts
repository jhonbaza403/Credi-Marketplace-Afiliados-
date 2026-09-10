// ==========================================================
// Credi Marketplace — Canonical Application Routes
// ==========================================================
// Internal routes only. External provider destinations live
// in dedicated integration/config modules.

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
  settings: "/dashboard/settings",
  profile: "/dashboard/profile",
  marketplace: "/marketplace",
  products: "/products",
  productDetailBase: "/products",
  productCreate: "/products/create",
  services: "/services",
  sellers: "/sellers",
  search: "/search",
  partners: "/partners",
  affiliate: "/affiliate",
  affiliateDashboard: "/dashboard/affiliate",
  affiliateLinks: "/dashboard/affiliate/links",
  b2b: "/b2b",
  b2bPublish: "/b2b/publish",
  checkout: "/checkout",
  cart: "/cart",
  orders: "/orders",
  account: "/account",
  publish: "/publish",
  admin: "/admin",
  adminCompliance: "/admin/compliance",
  compliance: "/dashboard/compliance",
} as const;

export function productDetailPath(productId: string): string {
  return `${ROUTES.productDetailBase}/${encodeURIComponent(productId)}`;
}

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
