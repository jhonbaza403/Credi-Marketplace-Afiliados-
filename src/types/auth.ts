/**
 * Tipos centrales de autenticación y autorización.
 *
 * Compatible con:
 * - Next.js 16.3 App Router
 * - React 19.2
 * - TypeScript estricto
 * - Supabase Auth
 */

export const USER_ROLES = [
  'customer',
  'vendor',
  'professional',
  'company',
  'admin',
] as const

export type UserRole = (typeof USER_ROLES)[number]

export const AUTH_STATUSES = [
  'authenticated',
  'unauthenticated',
  'loading',
] as const

export type AuthStatus = (typeof AUTH_STATUSES)[number]

export interface AuthUser {
  id: string
  email: string | null
  phone?: string | null
  role: UserRole
  fullName?: string | null
  avatarUrl?: string | null
  emailConfirmedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface AuthSession {
  user: AuthUser
  accessToken?: string
  expiresAt?: number
}

export interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  session: AuthSession | null
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  fullName: string
  email: string
  password: string
  role?: UserRole
}

export interface ForgotPasswordInput {
  email: string
}

export interface UpdatePasswordInput {
  password: string
  confirmPassword: string
}

export interface AuthResult<T = null> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === 'string' &&
    (USER_ROLES as readonly string[]).includes(value)
  )
}

export function isPrivilegedRole(role: UserRole): boolean {
  return role === 'admin'
}

export function isVendorRole(role: UserRole): boolean {
  return role === 'vendor'
}

export function isCustomerRole(role: UserRole): boolean {
  return role === 'customer'
}
