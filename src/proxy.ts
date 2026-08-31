// ==========================================================
// ARCHIVO: src/proxy.ts
// Credi Marketplace
//
// Route Protection Layer
//
// Next.js Proxy
// Supabase Auth
// RBAC Security
// ==========================================================


import {
  NextResponse,
} from "next/server";


import type {
  NextRequest,
} from "next/server";


import {
  createServerClient,
} from "@supabase/ssr";




// ==========================================================
// PROXY PRINCIPAL
// ==========================================================

export async function proxy(

  request: NextRequest,

) {


  let response =
    NextResponse.next({

      request,

    });



  const supabase =
    createServerClient(

      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,

      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,

      {

        cookies: {

          getAll() {

            return request.cookies.getAll();

          },


          setAll(
            cookiesToSet,
          ) {


            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {


                request.cookies.set(
                  name,
                  value,
                );


                response.cookies.set(
                  name,
                  value,
                );


              },
            );


          },

        },

      },

    );




  const {
    data: {
      user,
    },

  } =
    await supabase.auth.getUser();





  const pathname =
    request.nextUrl.pathname;





  // ========================================================
  // RUTAS PROTEGIDAS
  // ========================================================


  const protectedRoutes = [

    "/dashboard",

    "/checkout",

    "/cart",

  ];



  const requiresAuth =
    protectedRoutes.some(

      (route) =>
        pathname.startsWith(route),

    );




  if (

    requiresAuth

    &&

    !user

  ) {


    return NextResponse.redirect(

      new URL(

        "/login",

        request.url,

      ),

    );

  }





  // ========================================================
  // RUTAS SOLO INVITADOS
  // ========================================================


  const guestOnlyRoutes = [

    "/login",

    "/register",

    "/forgot-password",

    "/reset-password",

  ];



  const guestRoute =
    guestOnlyRoutes.some(

      (route) =>
        pathname.startsWith(route),

    );





  if (

    guestRoute

    &&

    user

  ) {


    return NextResponse.redirect(

      new URL(

        "/dashboard",

        request.url,

      ),

    );

  }





  return response;

}




// ==========================================================
// CONFIGURACIÓN DE EJECUCIÓN
// ==========================================================

export const config = {


  matcher: [

    "/dashboard/:path*",

    "/checkout/:path*",

    "/cart/:path*",

    "/login",

    "/register",

    "/forgot-password",

    "/reset-password",

  ],


};
