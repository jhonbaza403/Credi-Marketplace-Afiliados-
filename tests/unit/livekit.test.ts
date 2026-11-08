import { createHash, createHmac } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { createLiveKitJwt, liveKitHttpUrl, liveKitRoomName, verifyLiveKitWebhook } from '@/lib/live/livekit'

afterEach(() => vi.unstubAllEnvs())

function signedWebhook(body: string, secret: string, apiKey: string) {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ iss: apiKey, nbf: now - 1, exp: now + 60, sha256: createHash('sha256').update(body).digest('base64') })).toString('base64url')
  const unsigned = header + '.' + payload
  const signature = createHmac('sha256', secret).update(unsigned).digest('base64url')
  return 'Bearer ' + unsigned + '.' + signature
}

describe('LiveKit server integration', () => {
  const secret = 'test-livekit-secret'
  const apiKey = 'test-livekit-key'
  const configure = () => {
    vi.stubEnv('LIVEKIT_URL', 'wss://credimarketplace-f8e677hx.livekit.cloud')
    vi.stubEnv('LIVEKIT_API_KEY', apiKey)
    vi.stubEnv('LIVEKIT_API_SECRET', secret)
  }
  it('creates short-lived scoped participant JWTs', () => {
    configure()
    const token = createLiveKitJwt({ sub: 'user-123', video: { roomJoin: true, room: 'credi-live-room', canPublish: false } }, 600)
    const [header, payload, signature] = token.split('.')
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    const expected = createHmac('sha256', secret).update(header + '.' + payload).digest('base64url')
    expect(JSON.parse(Buffer.from(header, 'base64url').toString('utf8')).alg).toBe('HS256')
    expect(claims.iss).toBe(apiKey)
    expect(claims.sub).toBe('user-123')
    expect(claims.video.canPublish).toBe(false)
    expect(claims.exp - claims.iat).toBe(600)
    expect(signature).toBe(expected)
  })
  it('normalizes the API host and deterministic Credi room names', () => {
    configure()
    expect(liveKitHttpUrl()).toBe('https://credimarketplace-f8e677hx.livekit.cloud')
    expect(liveKitRoomName('ABCDEF00-0000-4000-8000-000000000000')).toBe('credi-live-abcdef00-0000-4000-8000-000000000000')
  })
  it('accepts a signed webhook and rejects a modified body', () => {
    configure()
    const body = JSON.stringify({ event: 'participant_joined', room: { name: 'credi-live-room' } })
    const authorization = signedWebhook(body, secret, apiKey)
    expect(verifyLiveKitWebhook(body, authorization)).toBe(true)
    expect(verifyLiveKitWebhook(body + ' ', authorization)).toBe(false)
    expect(verifyLiveKitWebhook(body, null)).toBe(false)
  })
})