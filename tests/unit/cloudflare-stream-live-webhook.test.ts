import { describe, expect, it } from 'vitest'
import { verifyStreamLiveWebhookAuth } from '@/lib/cloudflare/stream-live-webhook'

describe('Cloudflare Stream Live webhook authentication', () => {
  const secret = 'test-only-webhook-secret'

  it('accepts the configured destination secret', () => {
    expect(verifyStreamLiveWebhookAuth(secret, secret)).toBe(true)
  })

  it('rejects a missing header', () => {
    expect(verifyStreamLiveWebhookAuth(null, secret)).toBe(false)
  })

  it('rejects an incorrect secret', () => {
    expect(verifyStreamLiveWebhookAuth('wrong-secret', secret)).toBe(false)
  })

  it('rejects empty secrets', () => {
    expect(verifyStreamLiveWebhookAuth('', secret)).toBe(false)
    expect(verifyStreamLiveWebhookAuth(secret, '')).toBe(false)
  })

  it('rejects a Stream VOD signature header value as a Live destination secret', () => {
    expect(verifyStreamLiveWebhookAuth('time=123,sig1=abcdef', secret)).toBe(false)
  })
})
