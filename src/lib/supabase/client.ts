import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function getRequiredPublicEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} no está configurada`);
  }

  return value;
}

/**
 * Creates the Supabase browser client for Client Components.
 * Uses only public Supabase environment variables.
 */
export function createClient() {
  return createBrowserClient(
    getRequiredPublicEnv("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl),
    getRequiredPublicEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      supabasePublishableKey,
    ),
  );
}

/**
 * Backward-compatible browser client export.
 * Prefer createClient() in new code.
 */
export const supabase = createClient();

/**
 * Backward-compatible alias used by older components.
 */
export const supabaseClient = supabase;
