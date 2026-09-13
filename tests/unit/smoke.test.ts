import { describe, expect, it } from 'vitest'
import { normalizePaymentMethod, isValidMoney } from '@/lib/payments/orchestrator'
import { calculateTax, roundMoney } from '@/lib/taxation/engine'

describe('Credi Marketplace — financial domain contracts', () => {
  it('normalizes supported payment rails without inventing providers', () => {
    expect(normalizePaymentMethod('CRYPTO')).toBe('crypto')
    expect(normalizePaymentMethod('wallet')).toBe('wallet')
    expect(normalizePaymentMethod('unknown-provider')).toBe('manual')
  })

  it('rejects invalid money and keeps rounding deterministic', () => {
    expect(isValidMoney(0)).toBe(false)
    expect(isValidMoney(Number.NaN)).toBe(false)
    expect(isValidMoney(10.5)).toBe(true)
    expect(roundMoney(10.005)).toBe(10.01)
  })

  it('calculates a tax rate as a pure deterministic function', () => {
    expect(calculateTax(100, 7.5)).toBe(7.5)
    expect(calculateTax(199.99, 10)).toBe(20)
  })
})
