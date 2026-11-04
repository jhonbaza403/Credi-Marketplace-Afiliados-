const DEFAULT_MAX_AGENT_PAYMENT_AMOUNT = 1000

/**
 * Invalid or negative deployment configuration disables agent payment creation.
 * A malformed ceiling must never become NaN/Infinity and bypass the payment limit.
 */
export function resolveAgentMaxPaymentAmount(value: string | undefined): number {
  if (value === undefined || value.trim() === '') return DEFAULT_MAX_AGENT_PAYMENT_AMOUNT
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return parsed
}

export function isAgentPaymentWithinLimit(amount: number, maximum: number): boolean {
  return Number.isFinite(amount) &&
    Number.isFinite(maximum) &&
    amount > 0 &&
    maximum >= 0 &&
    amount <= maximum
}
