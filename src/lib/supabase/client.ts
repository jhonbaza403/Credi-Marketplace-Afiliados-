import { createBrowserClient } from "@supabase/ssr";

const BUILD_PLACEHOLDER_URL = "https://placeholder.supabase.co";
const BUILD_PLACEHOLDER_KEY = "build-placeholder-key";

function getPublicEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function createClient() {
  const url = getPublicEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = getPublicEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  const options = {
    auth: {
      flowType: "pkce" as const,
      experimental: {
        passkey: true,
      },
    },
  } as const;

  if (url && key) {
    return createBrowserClient(url, key, options);
  }

  if (typeof window === "undefined") {
    return createBrowserClient(BUILD_PLACEHOLDER_URL, BUILD_PLACEHOLDER_KEY, options);
  }

  throw new Error(
    "Falta la configuración pública de Supabase. Configure NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
}
