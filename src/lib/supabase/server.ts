import "server-only";

import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function requiredPublicEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"): string {
  const value = name === "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    : process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!value) {
    throw new Error(
      name === "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
        ? "Falta la clave pública de Supabase: configure NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY."
        : "Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL.",
    );
  }

  return value;
}

export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createSupabaseServerClient(
    requiredPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredPublicEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components pueden no permitir escritura de cookies.
          }
        },
      },
    },
  );
}

export const createServerClient = createClient;
