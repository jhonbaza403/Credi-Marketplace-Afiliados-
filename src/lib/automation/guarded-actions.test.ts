import { describe, expect, it } from 'vitest'
import {
  automationDedupeKey,
  isSafeInternalActionUrl,
  isSupportedAutomationAction,
  isSupportedAutomationTrigger,
  normalizeAutomationNotification,
} from './guarded-actions'

describe('Credi guarded automation actions', () => {
  it('accepts only implemented trigger and action types', () => {
    expect(isSupportedAutomationTrigger('low_stock')).toBe(true)
    expect(isSupportedAutomationTrigger('rfq_created')).toBe(true)
    expect(isSupportedAutomationTrigger('schedule')).toBe(true)
    expect(isSupportedAutomationTrigger('external_webhook')).toBe(false)
    expect(isSupportedAutomationAction('notify_owner')).toBe(true)
    expect(isSupportedAutomationAction('move_money')).toBe(false)
    expect(isSupportedAutomationAction('run_arbitrary_code')).toBe(false)
  })

  it('rejects open redirects and control characters in notification actions', () => {
    expect(isSafeInternalActionUrl('/dashboard/orders')).toBe('/dashboard/orders')
    expect(isSafeInternalActionUrl('https://example.com')).toBe(null)
    expect(isSafeInternalActionUrl('//example.com')).toBe(null)
    expect(isSafeInternalActionUrl('/\\\\evil.example')).toBe(null)
    expect(isSafeInternalActionUrl('/path\nInjected: value')).toBe(null)
  })

  it('bounds user-authored notification copy and priority', () => {
    const value = normalizeAutomationNotification({
      title: '   ',
      message: 'A'.repeat(1400),
      action_url: '/automation',
      priority: 'critical',
    }, { title: 'Default title', message: 'Default message' })

    expect(value.title).toBe('Default title')
    expect(value.message).toHaveLength(1000)
    expect(value.priority).toBe('normal')
    expect(value.actionUrl).toBe('/automation')
  })

  it('builds a deterministic deduplication key for one trigger window', () => {
    expect(automationDedupeKey('rule-1', 'low_stock', 123)).toBe('automation:rule-1:low_stock:123')
  })
})
