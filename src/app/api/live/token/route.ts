import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isSameOrigin } from '@/lib/security/csrf'
import { requireApiAccountAccess } from '@/lib/auth/api-account-access'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { getRequestIp } from '@/lib/security/auth'
import { createLiveKitJwt, liveKitConfig, liveKitRoomName } from '@/lib/live/livekit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({ roomId: z.string().uuid() })
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Origen no autorizado.', code: 'CSRF_VALIDATION_FAILED' }, 403)
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return json({ error: 'Debes iniciar sesión.', code: 'UNAUTHENTICATED' }, 401)
  const access = await requireApiAccountAccess(supabase, user.id)
  if (!access.ok) return json({ error: 'La cuenta no cumple los requisitos de seguridad.', code: access.code }, access.status)
  const limit = await distributedRateLimit(supabase, 'livekit-token:' + user.id + ':' + getRequestIp(request), { limit: 12, windowMs: 60_000 })
  if (!limit.success) return json({ error: 'Demasiadas solicitudes de conexión.', code: 'RATE_LIMITED' }, 429)
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json({ error: 'La sala LIVE no es válida.', code: 'INVALID_ROOM' }, 400)

  try {
    const { url } = liveKitConfig()
    const { data: room, error } = await supabase.from('chat_live_rooms')
      .select('id,title,status,host_user_id')
      .eq('id', parsed.data.roomId)
      .maybeSingle()
    if (error) return json({ error: 'No fue posible verificar la sala.', code: 'LIVE_ROOM_LOOKUP_FAILED' }, 500)
    if (!room) return json({ error: 'Sala LIVE no encontrada.', code: 'LIVE_ROOM_NOT_FOUND' }, 404)
    const isHost = room.host_user_id === user.id
    if (!isHost && room.status !== 'live') return json({ error: 'Esta sala todavía no está disponible para espectadores.', code: 'LIVE_NOT_ACTIVE' }, 403)
    if (isHost && !['scheduled', 'live'].includes(room.status)) return json({ error: 'La sala no admite una conexión de anfitrión.', code: 'LIVE_ROOM_CLOSED' }, 409)

    const roomName = liveKitRoomName(room.id)
    const participantName = String(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Credi user').slice(0, 80)
    const token = createLiveKitJwt({
      sub: user.id,
      name: participantName,
      video: { roomJoin: true, room: roomName, canPublish: isHost, canSubscribe: true, canPublishData: isHost },
      metadata: JSON.stringify({ product: 'CREDI-LIVE', roomId: room.id, role: isHost ? 'host' : 'viewer' }),
    }, 600)
    return json({ server_url: url, participant_token: token, role: isHost ? 'host' : 'viewer', room_name: roomName })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'LIVEKIT_ERROR'
    if (code === 'LIVEKIT_NOT_CONFIGURED') return json({ error: 'LiveKit no está configurado en el entorno de servidor.', code }, 503)
    return json({ error: 'No fue posible preparar la conexión WebRTC.', code: 'LIVEKIT_TOKEN_FAILED' }, 500)
  }
}
