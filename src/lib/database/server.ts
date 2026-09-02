import {
  createServerClient,
} from "@supabase/ssr";

import type {
  CookieOptions,
} from "@supabase/ssr";

import {
  cookies,
} from "next/headers";

export async function getDatabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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
            // En Server Components puede no estar
            // permitido modificar cookies.
          }
        },
      },
    },
  );
}
