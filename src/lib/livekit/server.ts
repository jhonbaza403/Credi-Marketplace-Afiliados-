import 'server-only'

import { createHmac } from 'node:crypto'

type LiveKitConfig = {
  url: string
  httpUrl: string
  apiKey: string
  apiSecret: string
}

type LiveKitParticipant = {
  identity?: string
}

type LiveKitEgressResponse = {
  egressId?: string
  egress_id?: string
  status?: string
}

function config(): LiveKitConfig {
  const url = process.env.LIVEKIT_URL
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!url || !apiKey || !apiSecret) {
    throw new Error('LIVEKIT_NOT_CONFIGURED')
  }

  const parsed = new URL(url)
  if (!['wss:', 'ws:'].includes(parsed.protocol)) {
    throw new Error('LIVEKIT_INVALID_URL')
  }

  return {
    url: parsed.toString().replace(/\/$/, ''),
    httpUrl: `${parsed.protocol === 'wss:' ? 'https:' : 'http:'}//${parsed.host}`,
    apiKey,
    apiSecret,
  }
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url')
}

function signJwt(
  cfg: LiveKitConfig,
  subject: string,
  video: Record<string, unknown>,
  ttlSeconds = 300,
) {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64url(JSON.stringify({
    iss: cfg.apiKey,
    sub: subject,
    nbf: now - 5,
    exp: now + ttlSeconds,
    video,
  }))
  const unsigned = `${header}.${payload}`
  const signature = createHmac('sha256', cfg.apiSecret).update(unsigned).digest('base64url')
  return `${unsigned}.${signature}`
}

export function getLiveKitClientUrl() {
  return config().url
}

export function liveKitRoomName(roomId: string) {
  return `credi-live-${roomId}`
}

export function createLiveKitJoinToken(roomName: string, identity: string) {
  const cfg = config()
  return signJwt(cfg, identity, {
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  }, 15 * 60)
}

async function twirp<T>(
  service: 'RoomService' | 'Egress',
  method: string,
  body: Record<string, unknown>,
  grant: Record<string, unknown>,
): Promise<T> {
  const cfg = config()
  const token = signJwt(cfg, 'credi-live-server', grant, 60)
  const response = await fetch(
    `${cfg.httpUrl}/twirp/livekit.${service}/${method}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    },
  )
  const payload = await response.json().catch(() => null) as T | { message?: string; code?: string } | null
  if (!response.ok) {
    const detail = payload && 'message' in payload ? payload.message : null
    throw new Error(`LIVEKIT_API_ERROR:${detail || response.status}`)
  }
  if (!payload) throw new Error('LIVEKIT_EMPTY_RESPONSE')
  return payload as T
}

export async function isHostConnected(roomName: string, hostIdentity: string) {
  const result = await twirp<{ participants?: LiveKitParticipant[] }>(
    'RoomService',
    'ListParticipants',
    { room: roomName },
    { roomAdmin: true, room: roomName },
  )
  return (result.participants || []).some((participant) => participant.identity === hostIdentity)
}

export function cloudflareRtmpsDestination(input: {
  rtmps?: { url: string; streamKey: string }
}) {
  const url = input.rtmps?.url
  const streamKey = input.rtmps?.streamKey
  if (!url || !streamKey || !url.startsWith('rtmps://')) {
    throw new Error('CLOUDFLARE_RTMPS_DESTINATION_UNAVAILABLE')
  }
  return `${url.replace(/\/$/, '')}/${streamKey}`
}

export async function startCloudflareEgress(roomName: string, destination: string) {
  return twirp<LiveKitEgressResponse>(
    'Egress',
    'StartEgress',
    {
      room_name: roomName,
      template: { layout: 'speaker' },
      outputs: [{
        stream: {
          protocol: 'RTMP',
          urls: [destination],
        },
      }],
    },
    { roomRecord: true },
  )
}

export async function stopLiveKitEgress(egressId: string) {
  return twirp<LiveKitEgressResponse>(
    'Egress',
    'StopEgress',
    { egressId },
    { roomRecord: true },
  )
}
