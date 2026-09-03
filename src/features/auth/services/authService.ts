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

const getSupabase = () => createClient();

const DEFAULT_USER_ROLE: UserRole = 'customer';

export interface SignUpUserResult {
  user: User | null;
  session: AuthResponse['data']['session'];
  needsEmailConfirmation: boolean;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeFullName(fullName: string): string {
  return fullName.trim().replace(/\s+/g, ' ');
}

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

  const { data, error } = await getSupabase().auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: origin
        ? `${origin}/auth/callback`
        : undefined,
      data: {
        full_name: normalizedFullName,
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
    await getSupabase().auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOutUser(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();

  if (error) {
    throw error;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await getSupabase().auth.getUser();

  if (error) {
    if (error.name === 'AuthSessionMissingError') {
      return null;
    }

    throw error;
  }

  return user;
}

export async function getCurrentSession() {
  const {
    data: { session },
    error,
  } = await getSupabase().auth.getSession();

  if (error) {
    throw error;
  }

  return session;
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data, error } = await getSupabase()
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data?.role as UserRole | null) ?? null;
}

export async function getCurrentUserProfile() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data, error } = await getSupabase()
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
