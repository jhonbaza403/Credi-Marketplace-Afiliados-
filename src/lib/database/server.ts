import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

function required(name: string, fallbackName?: string): string {
  const value = process.env[name]?.trim() || (fallbackName ? process.env[fallbackName]?.trim() : undefined);
  if (!value) {
    throw new Error(
      fallbackName
        ? `Falta ${name} o ${fallbackName}.`
        : `Falta la variable de entorno ${name}.`,
    );
  }
  return value;
}

export async function getDatabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
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
