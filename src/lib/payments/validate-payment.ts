import {
  isUUID,
  isNonNegativeNumber,
} from '@/lib/validation/common'

import {
  MAX_PAYMENT_AMOUNT,
  PAYMENT_PROVIDERS,
} from './constants'

import type {
  PaymentProvider,
} from './types'

export interface PaymentValidationInput {
  orderId: unknown
  provider: unknown
  amount: unknown
  currency: unknown
}

export function validatePaymentInput(
  input: PaymentValidationInput,
):
  | {
      success: true
      orderId: string
      provider: PaymentProvider
      amount: number
      currency: string
    }
  | {
      success: false
      error: string
    } {
  if (!isUUID(input.orderId)) {
    return {
      success: false,
      error: 'Orden inválida.',
    }
  }

  if (
    typeof input.provider !== 'string' ||
    !PAYMENT_PROVIDERS.includes(
      input.provider as PaymentProvider,
    )
  ) {
    return {
      success: false,
      error: 'Proveedor de pago inválido.',
    }
  }

  if (
    !isNonNegativeNumber(input.amount) ||
    input.amount <= 0 ||
    input.amount > MAX_PAYMENT_AMOUNT
  ) {
    return {
      success: false,
      error: 'Monto de pago inválido.',
    }
  }

  if (
    typeof input.currency !== 'string' ||
    !/^[A-Z]{3,5}$/.test(
      input.currency,
    )
  ) {
    return {
      success: false,
      error: 'Moneda inválida.',
    }
  }

  return {
    success: true,
    orderId: input.orderId,
    provider:
      input.provider as PaymentProvider,
    amount: input.amount,
    currency: input.currency,
  }
}
