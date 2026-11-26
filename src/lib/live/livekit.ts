import 'server-only'
import { createHash, timingSafeEqual, webcrypto } from 'node:crypto'

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url')
}

async function signHs256(message: string, secret: string): Promise<Buffer> {
  const key = await webcrypto.subtle.importKey(
    'raw',
    Buffer.from(secret, 'utf8'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await webcrypto.subtle.sign('HMAC', key, Buffer.from(message, 'utf8'))
  return Buffer.from(signature)
}

async function verifyHs256(message: string, signature: Buffer, secret: string): Promise<boolean> {
  const key = await webcrypto.subtle.importKey(
    'raw',
    Buffer.from(secret, 'utf8'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  return webcrypto.subtle.verify('HMAC', key, signature, Buffer.from(message, 'utf8'))
}

export function liveKitConfig() {
  const url = process.env.LIVEKIT_URL?.trim()
  const apiKey = process.env.LIVEKIT_API_KEY?.trim()
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim()
  if (!url || !apiKey || !apiSecret) throw new Error('LIVEKIT_NOT_CONFIGURED')
  const parsed = new URL(url)
  if (parsed.protocol !== 'wss:' || !parsed.hostname || parsed.username || parsed.password) {
    throw new Error('LIVEKIT_URL_INVALID')
  }
  return { url: parsed.toString().replace(/\/$/, ''), apiKey, apiSecret }
}

export function liveKitRoomName(roomId: string) {
  return `credi-live-${roomId.toLowerCase()}`
}

export async function createLiveKitJwt(claims: Record<string, unknown>, ttlSeconds = 600): Promise<string> {
  const { apiKey, apiSecret } = liveKitConfig()
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 3600) {
    throw new Error('LIVEKIT_TOKEN_TTL_INVALID')
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = { iss: apiKey, nbf: now - 5, iat: now, exp: now + ttlSeconds, ...claims }
  const unsigned = `${base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64url(JSON.stringify(payload))}`
  const signature = await signHs256(unsigned, apiSecret)
  return `${unsigned}.${base64url(signature)}`
}

export function liveKitHttpUrl() {
  const { url } = liveKitConfig()
  const parsed = new URL(url)
  parsed.protocol = 'https:'
  return parsed.origin
}

export async function verifyLiveKitWebhook(rawBody: string, authorization: string | null): Promise<boolean> {
  if (!authorization?.startsWith('Bearer ')) return false
  try {
    const { apiKey, apiSecret } = liveKitConfig()
    const token = authorization.slice(7).trim()
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const [headerPart, payloadPart, signaturePart] = parts
    const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8')) as { alg?: string }
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as { iss?: string; exp?: number; nbf?: number; sha256?: string }
    if (header.alg !== 'HS256' || payload.iss !== apiKey) return false

    const now = Math.floor(Date.now() / 1000)
    if (typeof payload.exp !== 'number' || payload.exp < now || (typeof payload.nbf === 'number' && payload.nbf > now + 5)) return false

    const expectedBodyHash = createHash('sha256').update(rawBody, 'utf8').digest('hex')
    if (typeof payload.sha256 !== 'string') return false
    const expectedHash = Buffer.from(expectedBodyHash, 'hex')
    const suppliedHash = Buffer.from(payload.sha256, 'base64')
    if (expectedHash.length !== suppliedHash.length || !timingSafeEqual(expectedHash, suppliedHash)) return false

    const suppliedSignature = Buffer.from(signaturePart, 'base64url')
    return verifyHs256(`${headerPart}.${payloadPart}`, suppliedSignature, apiSecret)
  } catch {
    return false
  }
}
