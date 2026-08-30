// ==========================================================
// ARCHIVO: src/lib/auth/redirects.ts
// Credi Marketplace
//
// Authentication Redirect Manager
//
// Next.js App Router
// ==========================================================


import type {
  UserRole,
} from "./roles";




// ==========================================================
// RUTAS POR ROL
// ==========================================================

export const ROLE_REDIRECTS:

Record<UserRole, string> = {


  admin:

    "/dashboard/admin",



  seller:

    "/dashboard/seller",



  affiliate:

    "/dashboard/affiliate",



  customer:

    "/dashboard",



  user:

    "/dashboard",


};




// ==========================================================
// OBTENER RUTA SEGÚN ROL
// ==========================================================

export function getRedirectByRole(

  role?: string | null,

): string {


  if (!role) {

    return "/dashboard";

  }



  if (
    role in ROLE_REDIRECTS
  ) {

    return ROLE_REDIRECTS[
      role as UserRole
    ];

  }



  return "/dashboard";

}




// ==========================================================
// REDIRECCIÓN DESPUÉS DEL LOGIN
// ==========================================================

export function getLoginRedirect(

  user?: {

    role?: string | null;

  } | null,

): string {


  return getRedirectByRole(

    user?.role,

  );

}




// ==========================================================
// REDIRECCIÓN DESPUÉS DEL LOGOUT
// ==========================================================

export function getLogoutRedirect():

string {


  return "/login";

}
