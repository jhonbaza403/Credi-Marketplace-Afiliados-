import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  parseCloudflareLiveWebhook,
  verifyCloudflareWebhookSignature,
} from '@/lib/cloudflare/webhook'

const secret = 'test-only-webhook-secret'
const timestamp = 1_798_000_000
const fixedNow = timestamp * 1000

function signedHeaders(body: string, at = timestamp) {
  const signature = createHmac('sha256', secret).update(`${at}.${body}`, 'utf8').digest('hex')
  return new Headers({ 'Webhook-Signature': `time=${at},sig1=${signature}` })
}

describe('Cloudflare LIVE webhook contracts', () => {
  it('accepts the generic Cloudflare Notifications authentication header', () => {
    const body = JSON.stringify({
      data: { input_id: 'input-test-123', event_type: 'live_input.connected' },
    })
    expect(verifyCloudflareWebhookSignature(body, new Headers({ 'cf-webhook-auth': secret }), secret, fixedNow)).toBe(true)
    expect(verifyCloudflareWebhookSignature(body, new Headers({ 'cf-webhook-auth': 'wrong' }), secret, fixedNow)).toBe(false)
  })

  it('validates the timestamped Stream HMAC signature against the raw body', () => {
    const body = JSON.stringify({
      data: { input_id: 'input-test-123', event_type: 'live_input.disconnected' },
    })
    expect(verifyCloudflareWebhookSignature(body, signedHeaders(body), secret, fixedNow)).toBe(true)
    expect(verifyCloudflareWebhookSignature(`${body} `, signedHeaders(body), secret, fixedNow)).toBe(false)
    expect(verifyCloudflareWebhookSignature(body, signedHeaders(body, timestamp - 600), secret, fixedNow)).toBe(false)
    expect(verifyCloudflareWebhookSignature(body, new Headers(), secret, fixedNow)).toBe(false)
  })

  it.each([
    ['live_input.connected', 'connected'],
    ['live_input.disconnected', 'disconnected'],
    ['live_input.errored', 'errored'],
  ] as const)('parses the simulated %s event payload', (eventType, expected) => {
    const occurredAt = '2026-11-04T10:15:30.000Z'
    const payload = JSON.stringify({
      data: {
        input_id: 'input-test-123',
        event_type: eventType,
        updated_at: occurredAt,
        ...(eventType === 'live_input.errored'
          ? { live_input_errored: { error: { code: 'TEST_ERROR', message: 'synthetic failure' } } }
          : {}),
      },
    })

    const event = parseCloudflareLiveWebhook(payload)
    expect(event).toMatchObject({
      inputId: 'input-test-123',
      eventType,
      occurredAt,
    })
    expect(event?.eventType.split('.')[1]).toBe(expected)
    if (eventType === 'live_input.errored') {
      expect(event?.error).toEqual({ code: 'TEST_ERROR', message: 'synthetic failure' })
    }
  })

  it('fails closed for malformed, unsupported, or timestamp-invalid payloads', () => {
    expect(parseCloudflareLiveWebhook('{not-json')).toBeNull()
    expect(parseCloudflareLiveWebhook(JSON.stringify({
      data: { input_id: 'input-test-123', event_type: 'unknown.event' },
    }))).toBeNull()
    expect(parseCloudflareLiveWebhook(JSON.stringify({
      data: { input_id: 'input-test-123', event_type: 'live_input.connected', updated_at: 'not-a-date' },
    }))).toBeNull()
  })
})
