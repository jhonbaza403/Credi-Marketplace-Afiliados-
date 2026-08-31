import {
  isNonEmptyString,
  isNonNegativeNumber,
  isPositiveInteger,
  isUUID,
} from './common'

export const MAX_PRODUCT_QUANTITY = 100_000

export interface ProductValidationResult {
  success: boolean
  error?: string
}

export function validateProductId(
  value: unknown,
): ProductValidationResult {
  if (!isUUID(value)) {
    return {
      success: false,
      error: 'Identificador de producto inválido.',
    }
  }

  return { success: true }
}

export function validateProductQuantity(
  value: unknown,
): ProductValidationResult {
  if (!isPositiveInteger(value, MAX_PRODUCT_QUANTITY)) {
    return {
      success: false,
      error: `La cantidad debe ser un entero entre 1 y ${MAX_PRODUCT_QUANTITY}.`,
    }
  }

  return { success: true }
}

export function validateProductPrice(
  value: unknown,
): ProductValidationResult {
  if (
    !isNonNegativeNumber(value) ||
    value > 99_999_999.99
  ) {
    return {
      success: false,
      error: 'Precio de producto inválido.',
    }
  }

  return { success: true }
}

export function validateProductTitle(
  value: unknown,
): ProductValidationResult {
  if (!isNonEmptyString(value, 250)) {
    return {
      success: false,
      error: 'El título del producto no es válido.',
    }
  }

  return { success: true }
}
