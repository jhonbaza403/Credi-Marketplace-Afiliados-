import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isSameOrigin } from '@/lib/security/csrf'
import { requireApiAccountAccess } from '@/lib/auth/api-account-access'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { getRequestIp } from '@/lib/security/auth'
import { listInputVideos } from '@/lib/cloudflare/stream'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({ roomId: z.string().uuid() })
const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status,
  headers: { 'Cache-Control': 'private, no-store' },
})

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Origen no autorizado.', code: 'CSRF_VALIDATION_FAILED' }, 403)

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return json({ error: 'Debes iniciar sesión.', code: 'UNAUTHENTICATED' }, 401)

  const access = await requireApiAccountAccess(supabase, user.id)
  if (!access.ok) return json({ error: 'La cuenta no cumple los requisitos de seguridad.', code: access.code }, access.status)

  const limit = await distributedRateLimit(
    supabase,
    'live-replay-sync:' + user.id + ':' + getRequestIp(request),
    { limit: 8, windowMs: 60_000 },
  )
  if (!limit.success) return json({ error: 'Demasiadas comprobaciones de repetición.', code: 'RATE_LIMITED' }, 429)

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json({ error: 'La sala LIVE no es válida.', code: 'INVALID_ROOM' }, 400)

  const { data: room, error: roomError } = await supabase
    .from('chat_live_rooms')
    .select('id,host_user_id,status,metadata,replay_url')
    .eq('id', parsed.data.roomId)
    .eq('host_user_id', user.id)
    .maybeSingle()
  if (roomError) return json({ error: 'No fue posible comprobar la sala.', code: 'LIVE_ROOM_LOOKUP_FAILED' }, 500)
  if (!room) return json({ error: 'Sala LIVE no encontrada.', code: 'LIVE_ROOM_NOT_FOUND' }, 404)
  if (room.status !== 'ended') return json({ error: 'La sesión todavía no ha finalizado.', code: 'LIVE_NOT_ENDED' }, 409)
  if (room.replay_url) return json({ status: 'ready', replay_url: room.replay_url })

  const metadata = room.metadata && typeof room.metadata === 'object'
    ? room.metadata as Record<string, unknown>
    : {}
  const inputId = typeof metadata.cloudflare_live_input_id === 'string'
    ? metadata.cloudflare_live_input_id
    : null
  if (!inputId) return json({ error: 'La sala no tiene un Live Input asociado.', code: 'CLOUDFLARE_INPUT_REQUIRED' }, 409)

  try {
    const videos = await listInputVideos(inputId)
    const ready = videos.find(video => video.readyToStream || video.status?.state === 'ready')
    const checkedAt = new Date().toISOString()

    if (!ready) {
      const next = { ...metadata, cloudflare_replay_status: 'processing', cloudflare_replay_checked_at: checkedAt }
      const { error: updateError } = await supabase
        .from('chat_live_rooms')
        .update({ metadata: next })
        .eq('id', room.id)
        .eq('host_user_id', user.id)
      if (updateError) throw updateError
      return json({ status: 'processing', retry_after_ms: 15_000 }, 202)
    }

    const replayUrl = 'https://videodelivery.net/' + ready.uid + '/manifest/video.m3u8'
    const next = {
      ...metadata,
      cloudflare_replay_video_id: ready.uid,
      cloudflare_replay_status: 'ready',
      cloudflare_replay_checked_at: checkedAt,
      cloudflare_replay_ready_at: checkedAt,
    }
    const { error: updateError } = await supabase
      .from('chat_live_rooms')
      .update({ metadata: next, replay_url: replayUrl })
      .eq('id', room.id)
      .eq('host_user_id', user.id)
    if (updateError) throw updateError

    return json({ status: 'ready', replay_url: replayUrl })
  } catch (error) {
    console.error('[live:replay-sync] provider lookup failed', error instanceof Error ? error.message : 'UNKNOWN')
    return json({ error: 'Cloudflare Stream todavía no confirma la repetición.', code: 'REPLAY_SYNC_UNAVAILABLE' }, 502)
  }
}
