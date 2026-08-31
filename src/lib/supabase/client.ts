import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

function getRequiredPublicEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} no está configurada`);
  return value;
}

/** Creates a Supabase browser client for Client Components. */
export function createClient(): SupabaseClient {
  return createBrowserClient(
    getRequiredPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredPublicEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  );
}
