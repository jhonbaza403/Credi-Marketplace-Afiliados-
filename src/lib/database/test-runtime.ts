/**
 * Detects only the explicit placeholder pair injected by Playwright's local
 * webServer. A real Supabase URL or key must never be skipped.
 */
export function isPlaywrightSupabasePlaceholder(
  url: string | undefined,
  publishableKey: string | undefined,
): boolean {
  if (publishableKey !== "ci-placeholder-publishable-key" || !url) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" &&
      parsed.hostname === "127.0.0.1" &&
      parsed.port === "54321";
  } catch {
    return false;
  }
}
