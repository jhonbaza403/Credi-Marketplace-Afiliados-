import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSameOrigin } from '@/lib/security/csrf'
import { requireApiAccountAccess } from '@/lib/auth/api-account-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const schema = z.object({ roomId: z.string().uuid(), guestUserId: z.string().uuid(), action: z.enum(['invite', 'remove']) })
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } })

export async function GET(request: Request) {
  const session = await createClient()
  const { data: { user }, error } = await session.auth.getUser()
  if (error || !user) return json({ error: 'Debes iniciar sesión.' }, 401)
  const access = await requireApiAccountAccess(session, user.id)
  if (!access.ok) return json({ error: 'La cuenta no cumple los requisitos de seguridad.' }, access.status)
  const roomId = new URL(request.url).searchParams.get('roomId')
  if (!z.string().uuid().safeParse(roomId).success) return json({ error: 'La sala LIVE no es válida.' }, 400)
  try {
    const admin = createAdminClient()
    const { data: room, error: roomError } = await admin.from('chat_live_rooms')
      .select('id,host_user_id,settings').eq('id', roomId).maybeSingle()
    if (roomError) throw roomError
    if (!room) return json({ error: 'Sala LIVE no encontrada.' }, 404)
    if (room.host_user_id !== user.id) return json({ error: 'Solo el anfitrión puede consultar la lista de invitados.' }, 403)
    const settings = room.settings && typeof room.settings === 'object' ? room.settings as Record<string, unknown> : {}
    const guestUserIds = Array.isArray(settings.guest_user_ids) ? settings.guest_user_ids.filter((value): value is string => typeof value === 'string') : []
    return json({ guestUserIds })
  } catch (cause) {
    console.error('[Credi LIVE guests] Error al consultar invitados', cause)
    return json({ error: 'No fue posible consultar los invitados del escenario.' }, 500)
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Origen no autorizado.' }, 403)
  const session = await createClient()
  const { data: { user }, error } = await session.auth.getUser()
  if (error || !user) return json({ error: 'Debes iniciar sesión.' }, 401)
  const access = await requireApiAccountAccess(session, user.id)
  if (!access.ok) return json({ error: 'La cuenta no cumple los requisitos de seguridad.' }, access.status)
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json({ error: 'Datos de invitación no válidos.' }, 400)

  try {
    const admin = createAdminClient()
    const { roomId, guestUserId, action } = parsed.data
    const { data: room, error: roomError } = await admin.from('chat_live_rooms')
      .select('id,host_user_id,settings,status').eq('id', roomId).maybeSingle()
    if (roomError) throw roomError
    if (!room) return json({ error: 'Sala LIVE no encontrada.' }, 404)
    if (room.host_user_id !== user.id) return json({ error: 'Solo el anfitrión puede gestionar invitados.' }, 403)
    if (guestUserId === user.id) return json({ error: 'El anfitrión ya tiene acceso al escenario.' }, 400)
    const { data: invited, error: invitedError } = await admin.auth.admin.getUserById(guestUserId)
    if (invitedError || !invited.user) return json({ error: 'No existe una cuenta Credi para ese ID de usuario.' }, 404)

    const settings = room.settings && typeof room.settings === 'object'
      ? room.settings as Record<string, unknown>
      : {}
    const existing = Array.isArray(settings.guest_user_ids)
      ? settings.guest_user_ids.filter((value): value is string => typeof value === 'string')
      : []
    const guestUserIds = action === 'invite'
      ? [...new Set([...existing, guestUserId])].slice(0, 8)
      : existing.filter((id) => id !== guestUserId)
    const { error: updateError } = await admin.from('chat_live_rooms')
      .update({ settings: { ...settings, guest_user_ids: guestUserIds } })
      .eq('id', roomId).eq('host_user_id', user.id)
    if (updateError) throw updateError
    return json({ success: true, guestUserIds, message: action === 'invite' ? 'Invitado autorizado para el escenario LIVE.' : 'Acceso del invitado revocado.' })
  } catch (cause) {
    console.error('[Credi LIVE guests] Error al gestionar invitados', cause)
    return json({ error: 'No fue posible actualizar los invitados del escenario.' }, 500)
  }
}
