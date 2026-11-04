import crypto from 'node:crypto'

export const cloudflareLiveEventTypes = [
  'live_input.connected',
  'live_input.disconnected',
  'live_input.errored',
] as const

export type CloudflareLiveEventType = (typeof cloudflareLiveEventTypes)[number]

export type CloudflareLiveWebhookEvent = {
  inputId: string
  eventType: CloudflareLiveEventType
  occurredAt: string
  error: { code?: string; message?: string } | null
}

function safeEqual(expected: string, actual: string) {
  const expectedBytes = Buffer.from(expected, 'utf8')
  const actualBytes = Buffer.from(actual, 'utf8')
  return expectedBytes.length === actualBytes.length && crypto.timingSafeEqual(expectedBytes, actualBytes)
}

/**
 * Supports Cloudflare Notifications generic webhooks and timestamped Stream
 * video webhooks. The body must be the original, unmodified request body.
 */
export function verifyCloudflareWebhookSignature(
  body: string,
  headers: Headers,
  secret: string,
  nowMs = Date.now(),
) {
  if (!secret) return false

  const notificationSecret = headers.get('cf-webhook-auth')
  if (notificationSecret !== null) {
    return safeEqual(secret, notificationSecret)
  }

  const header = headers.get('Webhook-Signature')
  if (!header) return false

  const values = Object.fromEntries(header.split(',').map((part) => {
    const separator = part.indexOf('=')
    if (separator < 1) return ['', '']
    return [part.slice(0, separator).trim(), part.slice(separator + 1).trim()]
  }))

  const timestamp = Number(values.time)
  const signature = values.sig1
  if (!Number.isInteger(timestamp) || timestamp <= 0 || !signature) return false
  if (Math.abs(nowMs / 1000 - timestamp) > 300) return false

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${body}`, 'utf8')
    .digest('hex')

  return safeEqual(expected, signature)
}

export function parseCloudflareLiveWebhook(rawBody: string, now = new Date()): CloudflareLiveWebhookEvent | null {
  let payload: {
    data?: {
      input_id?: unknown
      event_type?: unknown
      updated_at?: unknown
      live_input_errored?: { error?: { code?: unknown; message?: unknown } }
    }
  }

  try {
    payload = JSON.parse(rawBody)
  } catch {
    return null
  }

  const inputId = payload.data?.input_id
  const eventType = payload.data?.event_type
  if (typeof inputId !== 'string' || inputId.length < 8 || inputId.length > 128) return null
  if (!cloudflareLiveEventTypes.includes(eventType as CloudflareLiveEventType)) return null

  const suppliedTimestamp = payload.data?.updated_at
  const occurredAt = typeof suppliedTimestamp === 'string' ? suppliedTimestamp : now.toISOString()
  if (!Number.isFinite(Date.parse(occurredAt))) return null

  const providerError = payload.data?.live_input_errored?.error
  return {
    inputId,
    eventType: eventType as CloudflareLiveEventType,
    occurredAt: new Date(occurredAt).toISOString(),
    error: providerError
      ? {
          ...(typeof providerError.code === 'string' ? { code: providerError.code } : {}),
          ...(typeof providerError.message === 'string' ? { message: providerError.message } : {}),
        }
      : null,
  }
}
