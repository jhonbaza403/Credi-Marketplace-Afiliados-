import "server-only";

import {
  createServerClient as createSupabaseServerClient,
} from "@supabase/ssr";

import type {
  CookieOptions,
} from "@supabase/ssr";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  cookies,
} from "next/headers";

function requiredEnv(
  name: string,
): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}`,
    );
  }

  return value;
}

export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createSupabaseServerClient(
    requiredEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
    ),
    requiredEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: CookieOptions;
          }>,
        ) {
          try {
            for (const {
              name,
              value,
              options,
            } of cookiesToSet) {
              cookieStore.set(
                name,
                value,
                options,
              );
            }
          } catch {
            // Server Components no siempre
            // pueden modificar cookies.
          }
        },
      },
    },
  );
}

export const createServerClient =
  createClient;
