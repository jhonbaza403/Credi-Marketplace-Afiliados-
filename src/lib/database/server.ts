// ==========================================================
// ARCHIVO: src/lib/database/server.ts
// Credi Marketplace
//
// Database Server Layer
//
// Next.js App Router
// Supabase SSR
// TypeScript
// ==========================================================

import {
  createServerClient,
} from "@supabase/ssr";

import {
  cookies,
} from "next/headers";


// ==========================================================
// CREAR CLIENTE DATABASE SERVER
// ==========================================================

export async function getDatabaseServerClient() {

  const cookieStore =
    await cookies();


  return createServerClient(

    process.env
      .NEXT_PUBLIC_SUPABASE_URL!,

    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY!,

    {

      cookies: {

        getAll() {

          return cookieStore.getAll();

        },


        setAll(
          cookiesToSet,
        ) {

          try {

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {

                cookieStore.set(
                  name,
                  value,
                  options,
                );

              },
            );


          } catch {

            // En Server Components
            // puede no permitir escritura
          }

        },

      },

    },

  );

}
