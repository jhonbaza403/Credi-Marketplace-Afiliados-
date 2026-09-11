export const PAYMENT_METHODS = ['stripe', 'crypto', 'bank_transfer', 'wallet', 'manual'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export type PaymentStatus = 'created' | 'pending' | 'requires_action' | 'succeeded' | 'failed' | 'cancelled' | 'expired'

export function normalizePaymentMethod(value: unknown): PaymentMethod {
  const method = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return (PAYMENT_METHODS as readonly string[]).includes(method) ? method as PaymentMethod : 'manual'
}

export function isValidMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function buildPaymentMetadata(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).slice(0, 30))
}
