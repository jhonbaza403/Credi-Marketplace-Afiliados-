import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireApiAccountAccess } from '@/lib/auth/api-account-access'
import { isSameOrigin } from '@/lib/security/csrf'
import {
  createLiveKitJoinToken,
  getLiveKitClientUrl,
  liveKitRoomName,
} from '@/lib/livekit/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ roomId: string }> }

const errorResponse = (message: string, status: number, code: string) =>
  NextResponse.json(
    { success: false, error: message, code },
    { status, headers: { 'Cache-Control': 'no-store' } },
  )

export async function POST(request: Request, context: Context) {
  if (!isSameOrigin(request)) {
    return errorResponse('Origen no autorizado.', 403, 'CSRF_VALIDATION_FAILED')
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) return errorResponse('No fue posible verificar la sesión.', 401, 'AUTHENTICATION_ERROR')
  if (!user) return errorResponse('Debes iniciar sesión.', 401, 'UNAUTHENTICATED')

  const access = await requireApiAccountAccess(supabase, user.id)
  if (!access.ok) {
    return errorResponse('La cuenta no cumple los requisitos de seguridad.', access.status, access.code)
  }

  const { roomId } = await context.params
  const { data: room, error } = await supabase
    .from('chat_live_rooms')
    .select('id,host_user_id,status')
    .eq('id', roomId)
    .eq('host_user_id', user.id)
    .maybeSingle()

  if (error) return errorResponse('No fue posible validar la sala LIVE.', 500, 'LIVE_ROOM_LOOKUP_FAILED')
  if (!room) return errorResponse('Sala LIVE no encontrada.', 404, 'LIVE_ROOM_NOT_FOUND')
  if (!['scheduled', 'live'].includes(room.status)) {
    return errorResponse('La sala no admite nuevas conexiones.', 409, 'LIVE_ROOM_NOT_JOINABLE')
  }

  try {
    const roomName = liveKitRoomName(room.id)
    const token = createLiveKitJoinToken(roomName, user.id)
    return NextResponse.json(
      { success: true, url: getLiveKitClientUrl(), roomName, token, identity: user.id },
      { headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' } },
    )
  } catch (error) {
    const code = error instanceof Error ? error.message : 'LIVEKIT_CONFIGURATION_ERROR'
    if (code === 'LIVEKIT_NOT_CONFIGURED') {
      return errorResponse('LiveKit aún requiere LIVEKIT_URL, LIVEKIT_API_KEY y LIVEKIT_API_SECRET en Vercel.', 503, code)
    }
    return errorResponse('No fue posible preparar la conexión LiveKit.', 503, 'LIVEKIT_TOKEN_FAILED')
  }
}
