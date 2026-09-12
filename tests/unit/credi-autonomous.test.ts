import { describe, expect, it } from 'vitest'
import { calculateReputation, estimateRoute, scoreCredit, shouldReleaseEscrow } from '../../src/lib/credi-autonomous'

describe('Credi autonomous commerce core', () => {
  it('produces an auditable credit decision', () => {
    const result = scoreCredit([
      { key: 'repayment_ratio', value: 1, source: 'test' },
      { key: 'account_recency_months', value: 24, source: 'test' },
      { key: 'completed_orders_90d', value: 20, source: 'test' },
      { key: 'dispute_rate', value: 0, source: 'test' },
      { key: 'return_rate', value: 0, source: 'test' },
      { key: 'identity_verified', value: 1, source: 'test' },
    ])
    expect(result.decision).toBe('approved')
    expect(result.riskBand).toBe('A')
    expect(result.reasons).toHaveLength(1)
  })

  it('orders logistics points and estimates distance', () => {
    const result = estimateRoute([
      { id: 'b', lat: 40.01, lng: -74.01, priority: 1 },
      { id: 'a', lat: 40, lng: -74, priority: 5 },
    ])
    expect(result.ordered[0].id).toBe('a')
    expect(result.distanceKm).toBeGreaterThan(0)
  })

  it('keeps reputation bounded', () => {
    expect(calculateReputation([{ weight: 100 }, { weight: -100 }])).toBe(50)
  })

  it('requires delivery and a closed dispute window before release', () => {
    expect(shouldReleaseEscrow({ delivered: false, disputeOpen: false, disputeDeadline: null })).toBe(false)
    expect(shouldReleaseEscrow({ delivered: true, disputeOpen: false, disputeDeadline: '2000-01-01T00:00:00.000Z', now: new Date('2001-01-01T00:00:00.000Z') })).toBe(true)
  })
})
