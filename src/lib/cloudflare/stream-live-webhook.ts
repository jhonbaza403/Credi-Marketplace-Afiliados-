import crypto from 'node:crypto'

/**
 * Cloudflare generic notification webhooks send the configured destination
 * secret in the cf-webhook-auth header. This is distinct from Stream VOD's
 * Webhook-Signature HMAC scheme.
 */
export function verifyStreamLiveWebhookAuth(header: string | null, secret: string): boolean {
  if (!header || !secret) return false

  const supplied = Buffer.from(header, 'utf8')
  const expected = Buffer.from(secret, 'utf8')
  if (supplied.length !== expected.length) return false

  return crypto.timingSafeEqual(supplied, expected)
}
