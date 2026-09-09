const CANONICAL_APP_URL = "https://credi-marketplace-afiliados.vercel.app";

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

/**
 * Canonical public URL for Credi Marketplace.
 *
 * Production SEO/canonical links always resolve to the single public domain.
 * Local development may still use localhost for development-only absolute URLs.
 */
export function getAppUrl(): string {
  if (process.env.NODE_ENV === "production") {
    return CANONICAL_APP_URL;
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return trimTrailingSlash(configured);
  }

  return "http://localhost:3000";
}

export { CANONICAL_APP_URL };
