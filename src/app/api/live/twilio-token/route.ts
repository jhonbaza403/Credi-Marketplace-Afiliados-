import { createHmac } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSameOrigin } from '@/lib/security/csrf'
import { requireApiAccountAccess } from '@/lib/auth/api-account-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({ roomId: z.string().uuid() })
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } })

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url')
}

function createVideoToken(identity: string, roomName: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim()
  const apiKeySid = process.env.TWILIO_API_KEY_SID?.trim()
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET?.trim()
  if (!accountSid || !apiKeySid || !apiKeySecret) throw new Error('TWILIO_VIDEO_NOT_CONFIGURED')

  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ typ: 'JWT', alg: 'HS256', cty: 'twilio-fpa;v=1' }))
  const payload = base64url(JSON.stringify({
    jti: `${apiKeySid}-${now}`,
    iss: apiKeySid,
    sub: accountSid,
    iat: now,
    exp: now + 3600,
    grants: { identity, video: { room: roomName } },
  }))
  const unsigned = `${header}.${payload}`
  const signature = createHmac('sha256', apiKeySecret).update(unsigned).digest('base64url')
  return `${unsigned}.${signature}`
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Origen no autorizado.' }, 403)
  const session = await createClient()
  const { data: { user }, error } = await session.auth.getUser()
  if (error || !user) return json({ error: 'Debes iniciar sesión.' }, 401)
  const access = await requireApiAccountAccess(session, user.id)
  if (!access.ok) return json({ error: 'La cuenta no cumple los requisitos de seguridad.' }, access.status)

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json({ error: 'La sala LIVE no es válida.' }, 400)

  try {
    const admin = createAdminClient()
    const { data: room, error: roomError } = await admin
      .from('chat_live_rooms')
      .select('id,host_user_id,status,settings')
      .eq('id', parsed.data.roomId)
      .maybeSingle()
    if (roomError) throw roomError
    if (!room) return json({ error: 'Sala LIVE no encontrada.' }, 404)
    const settings = room.settings && typeof room.settings === 'object'
      ? room.settings as Record<string, unknown>
      : {}
    const guestIds = Array.isArray(settings.guest_user_ids)
      ? settings.guest_user_ids.filter((value): value is string => typeof value === 'string')
      : []
    if (room.host_user_id !== user.id && !guestIds.includes(user.id)) {
      return json({ error: 'Solo el anfitrión o un invitado autorizado puede entrar al escenario.' }, 403)
    }
    if (room.status === 'ended' || room.status === 'cancelled') {
      return json({ error: 'Esta sesión LIVE ya ha finalizado.' }, 409)
    }
    const roomName = `credi-live-${room.id.replaceAll('-', '')}`
    return json({ token: createVideoToken(user.id, roomName), roomName, identity: user.id, ttl: 3600 })
  } catch (cause) {
    if (cause instanceof Error && cause.message === 'TWILIO_VIDEO_NOT_CONFIGURED') {
      return json({ error: 'Twilio Video no está configurado. Añade TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID y TWILIO_API_KEY_SECRET en Vercel.' }, 503)
    }
    console.error('[Credi LIVE Twilio] No fue posible emitir token de vídeo', cause)
    return json({ error: 'No fue posible preparar el escenario interactivo.' }, 502)
  }
}
