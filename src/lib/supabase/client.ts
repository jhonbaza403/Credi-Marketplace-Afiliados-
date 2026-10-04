import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  const options = {
    auth: {
      experimental: {
        passkey: true,
      },
    },
  } as const;

  if (!url || !key) {
    console.warn(
      "[Supabase] Missing public environment variables. Realtime features disabled.",
    );
    return null;
  }

  browserClient = createBrowserClient(url, key, options);

  return browserClient;
}
