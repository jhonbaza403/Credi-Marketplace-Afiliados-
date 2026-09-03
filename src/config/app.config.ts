import { SITE_CONFIG } from "./site";

/**
 * Backwards-compatible application configuration facade.
 * Canonical public identity/configuration lives in SITE_CONFIG.
 */
export const APP_CONFIG = {
  name: SITE_CONFIG.name,
  version: "1.0.0",
  environment: process.env.NODE_ENV ?? "development",
  url: SITE_CONFIG.url,
  supportedLocales: SITE_CONFIG.supportedLocales,
  defaultLocale: SITE_CONFIG.locale,
} as const;
