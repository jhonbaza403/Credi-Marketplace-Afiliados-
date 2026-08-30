// ==========================================================
// ARCHIVO: src/types/user.ts
// Tipos de usuarios, perfiles y tiendas
// Credi Marketplace
// ==========================================================

/**
 * Roles principales de la plataforma.
 *
 * IMPORTANTE:
 * Estos valores deben coincidir EXACTAMENTE con:
 *
 * public.user_role
 *
 * en PostgreSQL / Supabase.
 */
export type UserRole =
  | 'customer'
  | 'vendor'
  | 'professional'
  | 'company'
  | 'admin';

/**
 * Perfil completo del usuario.
 *
 * Corresponde principalmente a:
 *
 * public.profiles
 */
export interface UserProfile {
  /** UUID del usuario. Coincide con auth.users.id */
  id: string;

  /** Correo electrónico */
  email: string | null;

  /** Nombre completo o nombre visible */
  fullName: string;

  /** Rol principal del usuario */
  role: UserRole;

  /** URL pública del avatar */
  avatarUrl: string | null;

  /** Estado operativo de la cuenta */
  isActive: boolean;

  /** Fecha de creación en formato ISO */
  createdAt: string;

  /** Fecha de última actualización en formato ISO */
  updatedAt: string;
}

/**
 * Perfil comercial de una tienda.
 *
 * Corresponde a:
 *
 * public.stores
 */
export interface StoreProfile {
  /** UUID de la tienda */
  id: string;

  /** UUID del usuario propietario de la tienda */
  vendorId: string;

  /** Nombre comercial */
  storeName: string;

  /** Slug único utilizado en las URLs */
  slug: string;

  /** Descripción comercial */
  description: string | null;

  /** Indica si la tienda fue verificada */
  isVerified: boolean;

  /** Fecha de creación */
  createdAt: string;

  /** Fecha de última actualización */
  updatedAt: string;
}

/**
 * Información resumida de usuario.
 *
 * Utilizada en:
 * - tarjetas
 * - comentarios
 * - vendedores
 * - resultados de búsqueda
 * - perfiles públicos
 */
export interface UserSummary {
  id: string;
  fullName: string;
  role: UserRole;
  avatarUrl: string | null;
}

/**
 * Información resumida de una tienda.
 *
 * Utilizada en:
 * - tarjetas
 * - productos
 * - búsquedas
 * - marketplace
 */
export interface StoreSummary {
  id: string;
  storeName: string;
  slug: string;
  isVerified: boolean;
}

/**
 * Usuario acompañado de su tienda.
 *
 * La tienda es opcional porque:
 *
 * - un customer puede no tener tienda
 * - un professional puede no tener tienda
 * - una company puede tener una estructura diferente
 * - un vendor puede tener una o varias tiendas
 */
export interface UserWithStore extends UserProfile {
  store: StoreProfile | null;
}

/**
 * Perfil público básico.
 *
 * No incluye información sensible como:
 * - email
 * - estado interno
 * - información administrativa
 */
export interface PublicUserProfile {
  id: string;
  fullName: string;
  role: UserRole;
  avatarUrl: string | null;
}

/**
 * Datos utilizados durante el registro.
 *
 * No representa directamente una fila de PostgreSQL.
 */
export interface RegisterUserInput {
  email: string;
  password: string;
  fullName: string;
  role?: UserRole;
}

/**
 * Datos utilizados para actualizar
 * información editable del perfil.
 */
export interface UpdateUserProfileInput {
  fullName?: string;
  avatarUrl?: string | null;
}

/**
 * Datos necesarios para crear una tienda.
 */
export interface CreateStoreInput {
  storeName: string;
  slug: string;
  description?: string | null;
}

/**
 * Datos editables de una tienda.
 */
export interface UpdateStoreInput {
  storeName?: string;
  slug?: string;
  description?: string | null;
}
