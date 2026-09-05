import "server-only";

import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

let adminClient: SupabaseClient | undefined;

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function requiredAdminKey(): string {
  const value =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!value) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY for administrative Supabase access",
    );
  }

  return value;
}

/**
 * Server-only administrative Supabase client.
 *
 * Use only for trusted server operations such as webhooks, internal jobs,
 * and administrative workflows. Never import this module into Client
 * Components or expose the returned client to the browser.
 */
export function createAdminClient(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  adminClient = createSupabaseClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredAdminKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );

  return adminClient;
}
