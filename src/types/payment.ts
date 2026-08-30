/**
 * Tipos financieros y de pagos.
 *
 * Nunca almacenar secretos de proveedores de pago
 * en tipos enviados al cliente.
 */

export const PAYMENT_METHODS = [
  'paypal',
  'binance_pay',
  'usdt',
  'bank_transfer',
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_TRANSACTION_STATUSES = [
  'pending',
  'processing',
  'authorized',
  'completed',
  'failed',
  'cancelled',
  'refunded',
] as const

export type PaymentTransactionStatus =
  (typeof PAYMENT_TRANSACTION_STATUSES)[number]

export interface Payment {
  id: string
  orderId: string
  userId: string
  method: PaymentMethod
  status: PaymentTransactionStatus
  amount: number
  currency: string
  providerTransactionId: string | null
  createdAt: string
  updatedAt: string
}

export interface PaymentSummary {
  id: string
  orderId: string
  method: PaymentMethod
  status: PaymentTransactionStatus
  amount: number
  currency: string
  createdAt: string
}

export interface CreatePaymentInput {
  orderId: string
  method: PaymentMethod
}

export interface PaymentVerificationResult {
  verified: boolean
  paymentId: string | null
  orderId: string | null
  amount: number | null
  currency: string | null
  providerTransactionId: string | null
}

export interface PaymentWebhookEvent {
  provider: string
  eventId: string
  eventType: string
  transactionId?: string
  orderId?: string
  status: PaymentTransactionStatus
  amount?: number
  currency?: string
  occurredAt: string
}
