// ==========================================================
// Credi Marketplace — Canonical Application Routes
// ==========================================================
// This module contains internal routes only. External provider
// destinations live in dedicated configuration modules.

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
  settings: "/dashboard/settings",
  profile: "/dashboard/profile",
  marketplace: "/marketplace",
  products: "/products",
  productDetail: "/products/detail",
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

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
