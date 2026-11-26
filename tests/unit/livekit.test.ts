import { createHash, webcrypto } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { createLiveKitJwt, liveKitHttpUrl, liveKitRoomName, verifyLiveKitWebhook } from '@/lib/live/livekit'

afterEach(() => vi.unstubAllEnvs())

async function signedWebhook(body: string, secret: string, apiKey: string) {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ iss: apiKey, nbf: now - 1, exp: now + 60, sha256: createHash('sha256').update(body).digest('base64') })).toString('base64url')
  const unsigned = header + '.' + payload
  const key = await webcrypto.subtle.importKey('raw', Buffer.from(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = Buffer.from(await webcrypto.subtle.sign('HMAC', key, Buffer.from(unsigned))).toString('base64url')
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

  it('creates short-lived scoped participant JWTs', async () => {
    configure()
    const token = await createLiveKitJwt({ sub: 'user-123', video: { roomJoin: true, room: 'credi-live-room', canPublish: false } }, 600)
    const [header, payload, signature] = token.split('.')
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    const key = await webcrypto.subtle.importKey('raw', Buffer.from(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const validSignature = await webcrypto.subtle.verify('HMAC', key, Buffer.from(signature, 'base64url'), Buffer.from(header + '.' + payload))

    expect(JSON.parse(Buffer.from(header, 'base64url').toString('utf8')).alg).toBe('HS256')
    expect(claims.iss).toBe(apiKey)
    expect(claims.sub).toBe('user-123')
    expect(claims.video.canPublish).toBe(false)
    expect(claims.exp - claims.iat).toBe(600)
    expect(validSignature).toBe(true)
    await expect(createLiveKitJwt({ sub: 'user-123' }, 0)).rejects.toThrow('LIVEKIT_TOKEN_TTL_INVALID')
  })

  it('normalizes the API host and deterministic Credi room names', () => {
    configure()
    expect(liveKitHttpUrl()).toBe('https://credimarketplace-f8e677hx.livekit.cloud')
    expect(liveKitRoomName('ABCDEF00-0000-4000-8000-000000000000')).toBe('credi-live-abcdef00-0000-4000-8000-000000000000')
  })

  it('accepts a signed webhook and rejects a modified body', async () => {
    configure()
    const body = JSON.stringify({ event: 'participant_joined', room: { name: 'credi-live-room' } })
    const authorization = await signedWebhook(body, secret, apiKey)
    await expect(verifyLiveKitWebhook(body, authorization)).resolves.toBe(true)
    await expect(verifyLiveKitWebhook(body + ' ', authorization)).resolves.toBe(false)
    await expect(verifyLiveKitWebhook(body, null)).resolves.toBe(false)
  })
})
