import { createBrowserClient } from "@supabase/ssr";

const BUILD_PLACEHOLDER_URL = "https://placeholder.supabase.co";
const BUILD_PLACEHOLDER_KEY = "build-placeholder-key";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (url && key) {
    return createBrowserClient(url, key);
  }

  // Client components are rendered once by Next.js during the build.
  // Do not fail that render just because deployment-only public env vars
  // are not present in the CI environment. The real client is created
  // with the real Vercel/Supabase values at runtime in the browser.
  if (typeof window === "undefined") {
    return createBrowserClient(BUILD_PLACEHOLDER_URL, BUILD_PLACEHOLDER_KEY);
  }

  throw new Error(
    "Falta la configuración pública de Supabase: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
}
