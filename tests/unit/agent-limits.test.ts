import { describe, expect, it } from 'vitest'
import { isAgentPaymentWithinLimit, resolveAgentMaxPaymentAmount } from '@/lib/ai/agent-limits'

describe('Credi AI payment limit configuration', () => {
  it('uses the documented default only when no limit is configured', () => {
    expect(resolveAgentMaxPaymentAmount(undefined)).toBe(1000)
    expect(resolveAgentMaxPaymentAmount('')).toBe(1000)
  })

  it('fails closed for malformed, non-finite and negative deployment values', () => {
    for (const value of ['NaN', 'Infinity', '-Infinity', '-1', 'not-a-number']) {
      expect(resolveAgentMaxPaymentAmount(value)).toBe(0)
    }
  })

  it('allows only positive finite amounts not exceeding the configured maximum', () => {
    expect(isAgentPaymentWithinLimit(100, 1000)).toBe(true)
    expect(isAgentPaymentWithinLimit(1000, 1000)).toBe(true)
    expect(isAgentPaymentWithinLimit(1000.01, 1000)).toBe(false)
    expect(isAgentPaymentWithinLimit(1, 0)).toBe(false)
    expect(isAgentPaymentWithinLimit(Number.NaN, 1000)).toBe(false)
    expect(isAgentPaymentWithinLimit(Number.POSITIVE_INFINITY, 1000)).toBe(false)
  })
})
