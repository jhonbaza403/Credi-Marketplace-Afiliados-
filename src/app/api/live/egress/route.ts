import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isSameOrigin } from '@/lib/security/csrf'
import { requireApiAccountAccess } from '@/lib/auth/api-account-access'
import { createLiveKitJwt, liveKitHttpUrl, liveKitRoomName } from '@/lib/live/livekit'
import { getLiveInput } from '@/lib/cloudflare/stream'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({ roomId: z.string().uuid(), action: z.enum(['start', 'stop']) })
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

async function liveKitRequest(method: string, body: Record<string, unknown>) {
  const token = createLiveKitJwt({ sub: 'credi-live-egress', video: { roomRecord: true } }, 300)
  const response = await fetch(liveKitHttpUrl() + '/twirp/livekit.Egress/' + method, {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(20_000),
  })
  const result = await response.json().catch(() => null) as Record<string, unknown> | null
  if (!response.ok || !result) throw new Error('LIVEKIT_EGRESS_HTTP_' + response.status)
  return result
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Origen no autorizado.', code: 'CSRF_VALIDATION_FAILED' }, 403)
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return json({ error: 'Debes iniciar sesión.', code: 'UNAUTHENTICATED' }, 401)
  const access = await requireApiAccountAccess(supabase, user.id)
  if (!access.ok) return json({ error: 'La cuenta no cumple los requisitos de seguridad.', code: access.code }, access.status)
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json({ error: 'La operación de emisión no es válida.', code: 'INVALID_EGRESS_OPERATION' }, 400)

  const { data: room, error } = await supabase.from('chat_live_rooms')
    .select('id,title,status,host_user_id,metadata')
    .eq('id', parsed.data.roomId).eq('host_user_id', user.id).maybeSingle()
  if (error) return json({ error: 'No fue posible verificar la sala.', code: 'LIVE_ROOM_LOOKUP_FAILED' }, 500)
  if (!room) return json({ error: 'Solo el anfitrión puede controlar la emisión.', code: 'LIVE_HOST_REQUIRED' }, 403)
  const metadata = room.metadata && typeof room.metadata === 'object' ? room.metadata as Record<string, unknown> : {}
  const currentEgressId = typeof metadata.livekit_egress_id === 'string' ? metadata.livekit_egress_id : null

  try {
    if (parsed.data.action === 'stop') {
      if (!currentEgressId) return json({ success: true, stopped: false, reason: 'NO_ACTIVE_EGRESS' })
      const result = await liveKitRequest('StopEgress', { egress_id: currentEgressId })
      const next = { ...metadata, livekit_egress_id: null, livekit_egress_state: 'stopping', livekit_egress_updated_at: new Date().toISOString() }
      await supabase.from('chat_live_rooms').update({ metadata: next }).eq('id', room.id).eq('host_user_id', user.id)
      return json({ success: true, egress: result })
    }

    if (currentEgressId) return json({ success: true, egress_id: currentEgressId, already_started: true })
    if (!['scheduled', 'live'].includes(room.status)) return json({ error: 'La sala no admite una emisión.', code: 'LIVE_ROOM_CLOSED' }, 409)
    const inputId = typeof metadata.cloudflare_live_input_id === 'string' ? metadata.cloudflare_live_input_id : null
    if (!inputId) return json({ error: 'Primero provisiona el Live Input de Cloudflare Stream.', code: 'CLOUDFLARE_INPUT_REQUIRED' }, 409)
    const input = await getLiveInput(inputId)
    if (!input.rtmps?.url || !input.rtmps.streamKey) return json({ error: 'Cloudflare no devolvió las credenciales RTMPS de la sala.', code: 'CLOUDFLARE_RTMP_CREDENTIALS_MISSING' }, 409)
    const endpoint = new URL(input.rtmps.url)
    if (endpoint.protocol !== 'rtmps:') return json({ error: 'El endpoint RTMPS de Cloudflare no es válido.', code: 'CLOUDFLARE_RTMP_URL_INVALID' }, 502)
    const streamUrl = endpoint.toString().replace(/\/$/, '') + '/' + encodeURIComponent(input.rtmps.streamKey)
    const result = await liveKitRequest('StartEgress', {
      room_name: liveKitRoomName(room.id),
      template: { layout: 'speaker' },
      outputs: [{ stream: { urls: [streamUrl] } }],
    })
    const egressId = typeof result.egress_id === 'string' ? result.egress_id : null
    if (!egressId) throw new Error('LIVEKIT_EGRESS_ID_MISSING')
    const next = { ...metadata, livekit_egress_id: egressId, livekit_egress_state: 'starting', livekit_egress_started_at: new Date().toISOString(), transport: 'livekit-webrtc-cloudflare-stream' }
    const { error: updateError } = await supabase.from('chat_live_rooms').update({ metadata: next }).eq('id', room.id).eq('host_user_id', user.id)
    if (updateError) {
      await liveKitRequest('StopEgress', { egress_id: egressId }).catch(() => null)
      return json({ error: 'La emisión se inició, pero no pudo vincularse a la sala Credi.', code: 'LIVEKIT_EGRESS_LINK_FAILED' }, 500)
    }
    return json({ success: true, egress_id: egressId, status: result.status ?? 'starting' }, 201)
  } catch (error) {
    const code = error instanceof Error ? error.message : 'LIVEKIT_EGRESS_FAILED'
    if (code === 'LIVEKIT_NOT_CONFIGURED') return json({ error: 'LiveKit no está configurado en el servidor.', code }, 503)
    if (code === 'CLOUDFLARE_STREAM_NOT_CONFIGURED') return json({ error: 'Cloudflare Stream no está configurado en el servidor.', code }, 503)
    return json({ error: 'No fue posible iniciar o detener la distribución LIVE.', code: 'LIVEKIT_EGRESS_FAILED' }, 502)
  }
}
