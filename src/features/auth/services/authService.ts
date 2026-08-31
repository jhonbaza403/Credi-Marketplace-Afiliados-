// ==========================================================
// ARCHIVO: src/features/auth/services/authService.ts
// Credi Marketplace
//
// Servicio centralizado de autenticación con Supabase Auth.
//
// Responsabilidades:
// - Registro de usuarios
// - Inicio de sesión
// - Cierre de sesión
// - Obtención del usuario autenticado
// - Gestión controlada de metadatos iniciales
//
// SEGURIDAD:
// - Nunca contiene SERVICE_ROLE_KEY.
// - Nunca concede privilegios administrativos.
// - Nunca utiliza metadata del usuario como fuente de autorización.
// - La autorización definitiva depende de profiles.role + RLS.
// ==========================================================

import type { AuthResponse, User } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types/user';

const supabase = createClient();

// ==========================================================
// CONSTANTES
// ==========================================================

const DEFAULT_USER_ROLE: UserRole = 'customer';

// ==========================================================
// TIPOS
// ==========================================================

export interface SignUpUserResult {
  user: User | null;
  session: AuthResponse['data']['session'];
  needsEmailConfirmation: boolean;
}

// ==========================================================
// VALIDACIÓN INTERNA
// ==========================================================

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeFullName(fullName: string): string {
  return fullName.trim().replace(/\s+/g, ' ');
}

// ==========================================================
// REGISTRO
// ==========================================================

/**
 * Registra un nuevo usuario en Supabase Auth.
 *
 * El usuario se crea inicialmente con el rol `customer`.
 *
 * IMPORTANTE:
 * El rol enviado en metadata es solamente informativo.
 * La autorización real debe depender de:
 *
 * public.profiles.role
 *
 * y de las políticas RLS de Supabase.
 */
export async function signUpUser(
  email: string,
  password: string,
  fullName: string,
): Promise<SignUpUserResult> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedFullName = normalizeFullName(fullName);

  if (!normalizedEmail) {
    throw new Error('El correo electrónico es obligatorio.');
  }

  if (!password) {
    throw new Error('La contraseña es obligatoria.');
  }

  if (!normalizedFullName) {
    throw new Error('El nombre completo es obligatorio.');
  }

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : undefined;

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: origin
        ? `${origin}/auth/callback`
        : undefined,

      data: {
        full_name: normalizedFullName,

        /**
         * Este valor NO constituye una autorización.
         *
         * El trigger de Supabase crea el perfil con:
         * role = 'customer'
         *
         * según el esquema de base de datos.
         */
        initial_role: DEFAULT_USER_ROLE,
      },
    },
  });

  if (error) {
    throw error;
  }

  return {
    user: data.user,
    session: data.session,
    needsEmailConfirmation:
      Boolean(data.user) && !data.session,
  };
}

// ==========================================================
// INICIO DE SESIÓN
// ==========================================================

/**
 * Inicia sesión mediante correo electrónico y contraseña.
 *
 * Supabase administra la sesión y las cookies correspondientes.
 */
export async function signInUser(
  email: string,
  password: string,
) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error('El correo electrónico es obligatorio.');
  }

  if (!password) {
    throw new Error('La contraseña es obligatoria.');
  }

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

  if (error) {
    throw error;
  }

  return data;
}

// ==========================================================
// CIERRE DE SESIÓN
// ==========================================================

/**
 * Cierra la sesión actual.
 */
export async function signOutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

// ==========================================================
// USUARIO ACTUAL
// ==========================================================

/**
 * Obtiene el usuario autenticado actualmente.
 *
 * Se utiliza getUser() y no getSession() para obtener
 * información autenticada validada por Supabase Auth.
 */
export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    /**
     * Una sesión inexistente no debe convertirse
     * automáticamente en una excepción de aplicación.
     *
     * Supabase puede devolver AuthSessionMissingError
     * cuando no existe una sesión activa.
     */
    if (error.name === 'AuthSessionMissingError') {
      return null;
    }

    throw error;
  }

  return user;
}

// ==========================================================
// SESIÓN ACTUAL
// ==========================================================

/**
 * Obtiene la sesión actual del navegador.
 *
 * Esta función está pensada principalmente para componentes
 * de interfaz donde se necesita conocer el estado de sesión.
 *
 * Para decisiones sensibles de autorización se debe utilizar
 * getUser() y las políticas RLS correspondientes.
 */
export async function getCurrentSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return session;
}

// ==========================================================
// ROL DEL USUARIO
// ==========================================================

/**
 * Obtiene el rol real almacenado en public.profiles.
 *
 * NO utiliza user_metadata para determinar privilegios.
 *
 * La base de datos es la fuente de verdad del RBAC.
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data?.role as UserRole | null) ?? null;
}

// ==========================================================
// PERFIL ACTUAL
// ==========================================================

/**
 * Obtiene el perfil completo del usuario autenticado.
 *
 * El registro procede de public.profiles.
 */
export async function getCurrentUserProfile() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
        id,
        email,
        full_name,
        role,
        avatar_url,
        is_active,
        created_at,
        updated_at
      `,
    )
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
