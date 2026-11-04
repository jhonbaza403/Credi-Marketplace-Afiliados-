const API_BASE = 'https://api.cloudflare.com/client/v4'

type CloudflareResponse<T> = {
  success: boolean
  errors?: Array<{ code: number; message: string }>
  result: T
}

export class CloudflareStreamApiError extends Error {
  constructor(
    readonly httpStatus: number,
    readonly providerCode?: number,
  ) {
    super("CLOUDFLARE_STREAM_API_ERROR")
    this.name = "CloudflareStreamApiError"
  }
}

export function cloudflareStreamFailure(error: unknown) {
  if (error instanceof CloudflareStreamApiError) {
    if (error.httpStatus === 401) {
      return {
        status: 503,
        code: "CLOUDFLARE_TOKEN_INVALID",
        message: "Cloudflare no aceptó el token configurado. Comprueba en el entorno de prueba que siga activo y pertenezca a la cuenta Credi. No compartas el token en mensajes ni registros públicos.",
      }
    }
    if (error.httpStatus === 403) {
      return {
        status: 503,
        code: "CLOUDFLARE_STREAM_PERMISSION_DENIED",
        message: "Cloudflare rechazó el acceso a Stream. El token necesita Stream Write para crear Live Inputs y Stream Read para consultar el estado y las grabaciones de la emisión.",
      }
    }
    if (error.httpStatus === 429) {
      return {
        status: 429,
        code: "CLOUDFLARE_RATE_LIMITED",
        message: "Cloudflare limitó temporalmente las solicitudes LIVE. Espera antes de volver a intentarlo.",
      }
    }
    if (error.httpStatus === 404) {
      return {
        status: 502,
        code: "CLOUDFLARE_LIVE_INPUT_NOT_FOUND",
        message: "Cloudflare no encontró el Live Input asociado a esta sala. Actualiza el diagnóstico y comprueba la vinculación del identificador.",
      }
    }
  }

  if (error instanceof Error && error.message === "CLOUDFLARE_STREAM_NOT_CONFIGURED") {
    return {
      status: 503,
      code: "CLOUDFLARE_STREAM_NOT_CONFIGURED",
      message: "El entorno de prueba todavía no tiene CLOUDFLARE_ACCOUNT_ID y CLOUDFLARE_API_TOKEN configurados.",
    }
  }

  return {
    status: 502,
    code: "CLOUDFLARE_TRANSPORT_ERROR",
    message: "No fue posible operar el transporte LIVE. Consulta el diagnóstico del proveedor e inténtalo de nuevo.",
  }
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
  | { state: 'ready'; inputId: string; videoId: string; createdAt: string; playbackUrl: string; dashUrl: string | null }
  | { state: 'processing' | 'invalid_playback'; inputId: string; videoId: string; createdAt: string }
  | { state: 'not_found'; inputId: string; videoId: null; createdAt: null }

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
    throw new CloudflareStreamApiError(response.status, body?.errors?.[0]?.code)
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
 * Cloudflare Stream playback URLs must point to the exact video UID returned
 * by the Live Input videos endpoint. Reject custom/foreign hosts and URLs
 * that reference a different recording.
 */
export function isOfficialCloudflareStreamManifestUrl(value: string | undefined, videoId: string, format: 'hls' | 'dash') {
  if (!value || !videoId) return false
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    const officialHost = host === 'videodelivery.net' || host.endsWith('.cloudflarestream.com')
    if (url.protocol !== 'https:' || !officialHost || url.username || url.password) return false
    const segments = url.pathname.split('/').filter(Boolean)
    const videoIndex = segments.indexOf(videoId)
    if (videoIndex < 0) return false
    const expectedManifest = format === 'hls' ? ['manifest', 'video.m3u8'] : ['manifest', 'video.mpd']
    return segments.slice(videoIndex + 1).join('/') === expectedManifest.join('/')
  } catch {
    return false
  }
}

/**
 * Select only recordings for this input and the exact broadcast window.
 * Cloudflare's input-scoped videos endpoint is authoritative for input
 * association; when the response also includes liveInput, it must match.
 * A two-minute tolerance covers provider/event timestamp drift.
 */
export async function syncLatestReplay(
  inputId: string,
  startedAt?: string | null,
  endedAt?: string | null,
): Promise<ReplaySyncResult> {
  const start = startedAt ? Date.parse(startedAt) : Number.NaN
  const end = endedAt ? Date.parse(endedAt) : Date.now()
  const notFound: ReplaySyncResult = { state: 'not_found', inputId, videoId: null, createdAt: null }
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return notFound

  const recordings = await listInputVideos(inputId)
  const toleranceMs = 120_000
  const currentBroadcast = recordings
    .filter((video) => typeof video.uid === 'string' && video.uid.length > 0)
    .filter((video) => !video.liveInput || video.liveInput === inputId)
    .filter((video) => {
      if (!video.created) return false
      const created = Date.parse(video.created)
      return Number.isFinite(created)
        && created >= start - toleranceMs
        && created <= end + toleranceMs
    })
    .map((video) => ({ video, createdMs: Date.parse(video.created!) }))
    .sort((a, b) => b.createdMs - a.createdMs)

  for (const { video } of currentBroadcast) {
    const isReady = video.readyToStream === true && video.status?.state === 'ready'
    if (!isReady) continue

    const hls = video.playback?.hls
    if (!isOfficialCloudflareStreamManifestUrl(hls, video.uid, 'hls')) {
      return { state: 'invalid_playback', inputId, videoId: video.uid, createdAt: video.created! }
    }

    const dash = video.playback?.dash
    if (dash && !isOfficialCloudflareStreamManifestUrl(dash, video.uid, 'dash')) {
      return { state: 'invalid_playback', inputId, videoId: video.uid, createdAt: video.created! }
    }

    return {
      state: 'ready',
      inputId,
      videoId: video.uid,
      createdAt: video.created!,
      playbackUrl: hls!,
      dashUrl: dash || null,
    }
  }

  const processing = currentBroadcast[0]
  if (processing) {
    return {
      state: 'processing',
      inputId,
      videoId: processing.video.uid,
      createdAt: processing.video.created!,
    }
  }
  return notFound
}

export function isCloudflareConfigured() {
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN)
}
