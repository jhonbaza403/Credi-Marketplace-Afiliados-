const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const CANONICAL_APP_URL = trimTrailingSlash(
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://credi-marketplace.bazajhon.workers.dev",
);

/**
 * Canonical public URL for Credi Marketplace.
 * Production links must resolve to the dedicated Cloudflare Workers deployment.
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
