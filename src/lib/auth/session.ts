// ==========================================================
// ARCHIVO: src/lib/auth/session.ts
// Credi Marketplace
//
// Gestión de sesión autenticada
//
// Supabase SSR
// Next.js App Router
// ==========================================================

import {
  getDatabaseServerClient,
} from "@/lib/database/server";


// ==========================================================
// TIPOS
// ==========================================================

export interface AuthSession {

  user: {

    id: string;

    email?: string;

    role?: string;

  } | null;


  authenticated: boolean;

}




// ==========================================================
// OBTENER SESIÓN ACTUAL
// ==========================================================

export async function getCurrentSession():

Promise<AuthSession> {


  const supabase =
    await getDatabaseServerClient();



  const {
    data,
    error,
  } =
    await supabase.auth.getSession();



  if (
    error ||
    !data.session
  ) {

    return {

      user: null,

      authenticated: false,

    };

  }



  const user =
    data.session.user;



  return {

    user: {

      id:
        user.id,


      email:
        user.email,


      role:
        user.user_metadata?.role
        ??
        "user",

    },


    authenticated: true,

  };

}




// ==========================================================
// OBTENER USUARIO
// ==========================================================

export async function getCurrentUser() {


  const session =
    await getCurrentSession();


  return session.user;

}





// ==========================================================
// VALIDAR LOGIN
// ==========================================================

export async function requireUser() {


  const session =
    await getCurrentSession();



  if (
    !session.authenticated ||
    !session.user
  ) {

    throw new Error(
      "Usuario no autenticado",
    );

  }



  return session.user;

}
