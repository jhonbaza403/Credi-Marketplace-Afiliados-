// ==========================================================
// ARCHIVO: src/lib/security.ts
// Credi Marketplace
//
// Seguridad, autorización, normalización y protección
// de entradas controladas por el usuario.
//
// PRINCIPIOS:
// - TypeScript estricto
// - Fail-closed
// - Separación entre autenticación y autorización
// - Defensa en profundidad
// - Sanitización contextual
// - Sin privilegios implícitos para usuarios desconocidos
// - Compatible con Next.js App Router + Supabase
// ==========================================================

import type { UserRole } from '@/types/user';

// ==========================================================
// TIPOS
// ==========================================================

/**
 * Resultado estándar de una operación de autorización.
 */
export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
}

/**
 * Contexto mínimo de autorización.
 *
 * No contiene información sensible.
 */
export interface SecurityUser {
  id: string;
  roles: readonly UserRole[];
  isActive: boolean;
}

// ==========================================================
// CONSTANTES
// ==========================================================

/**
 * Roles reconocidos por el sistema.
 *
 * Debe mantenerse sincronizado con:
 * public.user_role
 */
export const USER_ROLES: readonly UserRole[] = [
  'customer',
  'vendor',
  'professional',
  'company',
  'admin',
] as const;

/**
 * Roles con privilegios administrativos globales.
 *
 * IMPORTANTE:
 * Esta regla debe coincidir con la política RLS
 * de Supabase.
 */
const ADMIN_ROLES: readonly UserRole[] = ['admin'] as const;

// ==========================================================
// VALIDACIÓN DE ROLES
// ==========================================================

/**
 * Determina si una cadena corresponde a un UserRole válido.
 */
export function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === 'string' &&
    USER_ROLES.includes(value as UserRole)
  );
}

/**
 * Normaliza una colección de roles.
 *
 * - Elimina valores inválidos.
 * - Elimina duplicados.
 * - No concede privilegios adicionales.
 */
export function normalizeRoles(
  roles: readonly unknown[] | null | undefined,
): UserRole[] {
  if (!Array.isArray(roles)) {
    return [];
  }

  return Array.from(
    new Set(
      roles.filter(isUserRole),
    ),
  );
}

// ==========================================================
// ADMINISTRACIÓN
// ==========================================================

/**
 * Determina si una colección de roles contiene privilegios
 * administrativos globales.
 *
 * Fail-closed:
 * cualquier entrada inválida devuelve false.
 */
export function isAdmin(
  userRoles: readonly UserRole[] | null | undefined,
): boolean {
  if (!Array.isArray(userRoles) || userRoles.length === 0) {
    return false;
  }

  return userRoles.some((role) =>
    ADMIN_ROLES.includes(role),
  );
}

// ==========================================================
// AUTORIZACIÓN POR ROL
// ==========================================================

/**
 * Determina si el usuario posee un rol específico.
 *
 * Un administrador posee acceso global conforme a la política
 * de autorización definida por la aplicación.
 */
export function hasRequiredRole(
  userRoles: readonly UserRole[] | null | undefined,
  requiredRole: UserRole,
): boolean {
  if (!Array.isArray(userRoles) || userRoles.length === 0) {
    return false;
  }

  if (!isUserRole(requiredRole)) {
    return false;
  }

  if (isAdmin(userRoles)) {
    return true;
  }

  return userRoles.includes(requiredRole);
}

/**
 * Determina si el usuario posee al menos uno de los roles
 * requeridos.
 */
export function hasAnyRole(
  userRoles: readonly UserRole[] | null | undefined,
  requiredRoles: readonly UserRole[],
): boolean {
  if (
    !Array.isArray(userRoles) ||
    userRoles.length === 0 ||
    !Array.isArray(requiredRoles) ||
    requiredRoles.length === 0
  ) {
    return false;
  }

  if (isAdmin(userRoles)) {
    return true;
  }

  return requiredRoles.some((role) =>
    hasRequiredRole(userRoles, role),
  );
}

/**
 * Determina si el usuario posee todos los roles requeridos.
 */
export function hasAllRoles(
  userRoles: readonly UserRole[] | null | undefined,
  requiredRoles: readonly UserRole[],
): boolean {
  if (
    !Array.isArray(userRoles) ||
    userRoles.length === 0 ||
    !Array.isArray(requiredRoles) ||
    requiredRoles.length === 0
  ) {
    return false;
  }

  if (isAdmin(userRoles)) {
    return true;
  }

  return requiredRoles.every((role) =>
    userRoles.includes(role),
  );
}

// ==========================================================
// AUTORIZACIÓN DE USUARIO
// ==========================================================

/**
 * Verifica si una identidad puede operar dentro del sistema.
 *
 * Se exige:
 * - identidad válida;
 * - cuenta activa;
 * - al menos un rol válido.
 */
export function isAuthorizedUser(
  user: SecurityUser | null | undefined,
): boolean {
  if (!user) {
    return false;
  }

  if (!user.id || typeof user.id !== 'string') {
    return false;
  }

  if (!user.isActive) {
    return false;
  }

  const roles = normalizeRoles(user.roles);

  return roles.length > 0;
}

/**
 * Resultado detallado de autorización.
 *
 * Útil para Server Actions, APIs y servicios internos.
 */
export function authorizeUser(
  user: SecurityUser | null | undefined,
): AuthorizationResult {
  if (!user) {
    return {
      authorized: false,
      reason: 'AUTHENTICATION_REQUIRED',
    };
  }

  if (!user.isActive) {
    return {
      authorized: false,
      reason: 'ACCOUNT_DISABLED',
    };
  }

  if (!user.id) {
    return {
      authorized: false,
      reason: 'INVALID_USER',
    };
  }

  if (normalizeRoles(user.roles).length === 0) {
    return {
      authorized: false,
      reason: 'NO_VALID_ROLE',
    };
  }

  return {
    authorized: true,
  };
}

// ==========================================================
// VALIDACIÓN DE IDENTIFICADORES
// ==========================================================

/**
 * Valida un UUID estándar.
 *
 * Se utiliza para validar identificadores recibidos desde
 * formularios, URL, API o Server Actions.
 */
export function isValidUUID(
  value: unknown,
): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

// ==========================================================
// NORMALIZACIÓN DE TEXTO
// ==========================================================

/**
 * Normaliza texto controlado por el usuario.
 *
 * Esta función NO pretende ser un mecanismo de autorización.
 * Su finalidad es:
 *
 * - eliminar espacios exteriores;
 * - normalizar espacios repetidos;
 * - eliminar caracteres de control peligrosos;
 * - evitar entradas artificialmente infladas.
 */
export function normalizeInput(
  input: unknown,
  maxLength = 10_000,
): string {
  if (typeof input !== 'string') {
    return '';
  }

  if (maxLength <= 0) {
    return '';
  }

  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

// ==========================================================
// ESCAPE HTML
// ==========================================================

/**
 * Escapa caracteres HTML potencialmente peligrosos.
 *
 * IMPORTANTE:
 *
 * Esta función NO sustituye:
 * - React escaping;
 * - Content Security Policy;
 * - validación de datos;
 * - RLS;
 * - autorización;
 * - sanitización de HTML enriquecido.
 *
 * En React normalmente NO es necesario utilizarla para
 * contenido colocado mediante JSX, porque React escapa
 * automáticamente los valores de texto.
 */
export function escapeHtml(
  input: unknown,
): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Alias de compatibilidad para código existente.
 *
 * Se conserva sanitizeInput() para evitar romper imports
 * antiguos, pero internamente utiliza escapeHtml().
 */
export function sanitizeInput(
  input: string | null | undefined,
): string {
  return escapeHtml(input ?? '');
}

// ==========================================================
// VALIDACIÓN DE URL
// ==========================================================

/**
 * Protocolos HTTP permitidos.
 *
 * Se evita aceptar javascript:, data:, file:, etc.
 */
const ALLOWED_URL_PROTOCOLS = new Set([
  'http:',
  'https:',
]);

/**
 * Valida una URL externa segura.
 *
 * No debe utilizarse como sustituto de una política de
 * autorización para recursos internos.
 */
export function isSafeExternalUrl(
  value: unknown,
): value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }

  try {
    const url = new URL(value.trim());

    return ALLOWED_URL_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

// ==========================================================
// SLUGS
// ==========================================================

/**
 * Valida slugs utilizados en productos, tiendas,
 * categorías y páginas públicas.
 */
export function isValidSlug(
  value: unknown,
): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
    value.trim(),
  );
}

/**
 * Normaliza un texto para generar un slug.
 *
 * No reemplaza la validación final de unicidad en PostgreSQL.
 */
export function createSlug(
  input: unknown,
): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150);
}

// ==========================================================
// CORREO ELECTRÓNICO
// ==========================================================

/**
 * Validación práctica de correo electrónico.
 *
 * La validación definitiva debe realizarse también mediante
 * Supabase Auth y confirmación de correo.
 */
export function isSafeEmail(
  value: unknown,
): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const email = value.trim();

  if (
    email.length === 0 ||
    email.length > 254
  ) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ==========================================================
// SEGURIDAD DE IDENTIDAD
// ==========================================================

/**
 * Comprueba que un usuario solamente pueda operar sobre
 * su propia identidad.
 */
export function isSelf(
  authenticatedUserId: string | null | undefined,
  targetUserId: string | null | undefined,
): boolean {
  if (
    typeof authenticatedUserId !== 'string' ||
    typeof targetUserId !== 'string'
  ) {
    return false;
  }

  return (
    authenticatedUserId.trim() !== '' &&
    authenticatedUserId === targetUserId
  );
}

// ==========================================================
// PROPIEDAD DE RECURSOS
// ==========================================================

/**
 * Comprueba propiedad directa de un recurso.
 *
 * Debe complementarse con RLS en Supabase.
 */
export function isResourceOwner(
  authenticatedUserId: string | null | undefined,
  resourceOwnerId: string | null | undefined,
): boolean {
  return isSelf(
    authenticatedUserId,
    resourceOwnerId,
  );
}

// ==========================================================
// PRINCIPIO FAIL-CLOSED
// ==========================================================

/**
 * Convierte una condición de autorización en una decisión
 * estricta.
 *
 * Nunca debe utilizarse para conceder permisos basándose
 * en valores ambiguos.
 */
export function requireAuthorization(
  condition: boolean,
): void {
  if (!condition) {
    throw new Error('FORBIDDEN');
  }
}
