const API_BASE = 'https://api.cloudflare.com/client/v4'

type CloudflareResponse<T> = {
  success: boolean
  errors?: Array<{ code: number; message: string }>
  result: T
}

export type LiveInput = {
  uid: string
  enabled: boolean
  status?: string | null
  rtmps?: { url: string; streamKey: string }
  srt?: { url: string; streamId: string; passphrase: string }
  playback?: { hls?: string; dash?: string }
  webRTC?: { url: string }
  webRTCPlayback?: { url: string }
  recording?: { mode?: 'automatic' | 'off'; timeoutSeconds?: number }
}

export type LiveRecording = {
  uid: string
  created?: string
  liveInput?: string
  readyToStream?: boolean
  status?: { state?: string; pctComplete?: string }
  playback?: { hls?: string; dash?: string }
  thumbnail?: string
}

export type ReplaySyncResult =
  | { state: 'ready'; videoId: string; playbackUrl: string; dashUrl: string | null }
  | { state: 'processing'; videoId: string | null }
  | { state: 'not_found'; videoId: null }

function config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const token = process.env.CLOUDFLARE_API_TOKEN
  if (!accountId || !token) throw new Error('CLOUDFLARE_STREAM_NOT_CONFIGURED')
  return { accountId, token }
}

async function cf<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { accountId, token } = config()
  const response = await fetch(API_BASE + `/accounts/${accountId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  })
  const body = await response.json().catch(() => null) as CloudflareResponse<T> | null
  if (!response.ok || !body?.success) {
    const detail = body?.errors?.[0]?.message || `Cloudflare HTTP ${response.status}`
    throw new Error('CLOUDFLARE_API_ERROR:' + detail)
  }
  return body.result
}

export async function createLiveInput(roomId: string, title: string) {
  return cf<LiveInput>('/stream/live_inputs', {
    method: 'POST',
    headers: { 'Idempotency-Key': `credi-live-${roomId}` },
    body: JSON.stringify({
      enabled: true,
      meta: { name: title, room_id: roomId, product: 'CREDI-LIVE' },
      preferLowLatency: true,
      deleteRecordingAfterDays: 30,
      recording: { mode: 'automatic', timeoutSeconds: 0, requireSignedURLs: false },
    }),
  })
}

export async function getLiveInput(inputId: string) {
  return cf<LiveInput>(`/stream/live_inputs/${encodeURIComponent(inputId)}`)
}

export async function setLiveInputEnabled(inputId: string, enabled: boolean) {
  return cf<LiveInput>(`/stream/live_inputs/${encodeURIComponent(inputId)}`, {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  })
}

export async function rotateLiveInputKeys(inputId: string) {
  return cf<LiveInput>(`/stream/live_inputs/${encodeURIComponent(inputId)}/rotate_keys`, {
    method: 'POST',
  })
}

export async function listInputVideos(inputId: string) {
  return cf<LiveRecording[]>(`/stream/live_inputs/${encodeURIComponent(inputId)}/videos`)
}

export function classifyLiveInputStatus(status?: string | null) {
  switch (status) {
    case 'connected':
    case 'reconnected':
      return 'connected' as const
    case 'reconnecting':
      return 'recovering' as const
    case 'client_disconnect':
      return 'disconnected' as const
    case 'ttl_exceeded':
    case 'failed_to_connect':
    case 'failed_to_reconnect':
      return 'error' as const
    default:
      return 'unknown' as const
  }
}

/**
 * Select only recordings generated for the current broadcast window.
 * A small tolerance accounts for timestamp differences between systems.
 */
export async function syncLatestReplay(inputId: string, startedAt?: string | null): Promise<ReplaySyncResult> {
  const recordings = await listInputVideos(inputId)
  const start = startedAt ? Date.parse(startedAt) : Number.NaN
  const currentBroadcast = recordings
    .filter((video) => !video.liveInput || video.liveInput === inputId)
    .filter((video) => {
      if (!Number.isFinite(start) || !video.created) return true
      const created = Date.parse(video.created)
      return Number.isFinite(created) && created >= start - 120_000
    })
    .sort((a, b) => (Date.parse(b.created || '') || 0) - (Date.parse(a.created || '') || 0))

  const ready = currentBroadcast.find((video) =>
    video.readyToStream === true && video.status?.state === 'ready' && Boolean(video.playback?.hls),
  )
  if (ready?.playback?.hls) {
    return {
      state: 'ready',
      videoId: ready.uid,
      playbackUrl: ready.playback.hls,
      dashUrl: ready.playback.dash || null,
    }
  }

  const processing = currentBroadcast[0]
  if (processing) return { state: 'processing', videoId: processing.uid }
  return { state: 'not_found', videoId: null }
}

export function isCloudflareConfigured() {
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN)
}
