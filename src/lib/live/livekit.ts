import 'server-only'
import { createHmac, createHash, timingSafeEqual } from 'node:crypto'

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url')
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
  return { url: parsed.toString().replace(/\\/$/, ''), apiKey, apiSecret }
}

export function liveKitRoomName(roomId: string) {
  return `credi-live-${roomId.toLowerCase()}`
}

export function createLiveKitJwt(claims: Record<string, unknown>, ttlSeconds = 600) {
  const { apiKey, apiSecret } = liveKitConfig()
  const now = Math.floor(Date.now() / 1000)
  const payload = { iss: apiKey, nbf: now - 5, iat: now, exp: now + ttlSeconds, ...claims }
  const unsigned = `${base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64url(JSON.stringify(payload))}`
  const signature = createHmac('sha256', apiSecret).update(unsigned).digest()
  return `${unsigned}.${base64url(signature)}`
}

export function liveKitHttpUrl() {
  const { url } = liveKitConfig()
  const parsed = new URL(url)
  parsed.protocol = 'https:'
  return parsed.origin
}

export function verifyLiveKitWebhook(rawBody: string, authorization: string | null) {
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
    const suppliedHash = Buffer.from(payload.sha256, 'hex')
    if (expectedHash.length !== suppliedHash.length || !timingSafeEqual(expectedHash, suppliedHash)) return false
    const expectedSignature = createHmac('sha256', apiSecret).update(`${headerPart}.${payloadPart}`).digest()
    const suppliedSignature = Buffer.from(signaturePart, 'base64url')
    return expectedSignature.length === suppliedSignature.length && timingSafeEqual(expectedSignature, suppliedSignature)
  } catch {
    return false
  }
}
