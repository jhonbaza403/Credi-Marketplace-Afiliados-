import {
  isNonEmptyString,
  isValidEmail,
} from './common'

export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 128

export type AuthValidationResult =
  | {
      success: true
      email: string
      password: string
      fullName?: string
    }
  | {
      success: false
      error: string
    }

export function validateLoginPayload(
  body: unknown,
): AuthValidationResult {
  if (!body || typeof body !== 'object') {
    return {
      success: false,
      error: 'Datos de autenticación inválidos.',
    }
  }

  const data = body as Record<string, unknown>

  const email =
    typeof data.email === 'string'
      ? data.email.trim().toLowerCase()
      : ''

  const password =
    typeof data.password === 'string'
      ? data.password
      : ''

  if (!isValidEmail(email)) {
    return {
      success: false,
      error: 'El correo electrónico no es válido.',
    }
  }

  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return {
      success: false,
      error: `La contraseña debe contener entre ${MIN_PASSWORD_LENGTH} y ${MAX_PASSWORD_LENGTH} caracteres.`,
    }
  }

  return {
    success: true,
    email,
    password,
  }
}

export function validateRegisterPayload(
  body: unknown,
): AuthValidationResult {
  if (!body || typeof body !== 'object') {
    return {
      success: false,
      error: 'Datos de registro inválidos.',
    }
  }

  const data = body as Record<string, unknown>

  const email =
    typeof data.email === 'string'
      ? data.email.trim().toLowerCase()
      : ''

  const password =
    typeof data.password === 'string'
      ? data.password
      : ''

  const fullName =
    typeof data.fullName === 'string'
      ? data.fullName.trim()
      : ''

  if (!isValidEmail(email)) {
    return {
      success: false,
      error: 'El correo electrónico no es válido.',
    }
  }

  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return {
      success: false,
      error: `La contraseña debe contener entre ${MIN_PASSWORD_LENGTH} y ${MAX_PASSWORD_LENGTH} caracteres.`,
    }
  }

  if (
    !isNonEmptyString(fullName, 150)
  ) {
    return {
      success: false,
      error: 'El nombre completo es obligatorio.',
    }
  }

  return {
    success: true,
    email,
    password,
    fullName,
  }
}
