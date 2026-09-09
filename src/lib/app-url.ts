const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const normalizeUrl = (value: string | undefined): string | undefined => {
  if (!value) return undefined;

  const candidate = value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `https://${value}`;

  try {
    return trimTrailingSlash(new URL(candidate).toString());
  } catch {
    return undefined;
  }
};

/**
 * Returns the canonical public URL without hard-coding a transient Vercel
 * deployment hostname. NEXT_PUBLIC_APP_URL remains the preferred override.
 */
export function getAppUrl(): string {
  const configured = normalizeUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (configured) return configured;

  const production = normalizeUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (production) return production;

  const branch = normalizeUrl(process.env.VERCEL_BRANCH_URL);
  if (branch) return branch;

  const deployment = normalizeUrl(process.env.VERCEL_URL);
  if (deployment) return deployment;

  return "http://localhost:3000";
}
