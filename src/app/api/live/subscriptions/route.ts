import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isSameOrigin } from '@/lib/security/csrf'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { getRequestIp } from '@/lib/security/auth'
import { requireApiAccountAccess } from '@/lib/auth/api-account-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const channelSchema = z.string().uuid()
const actionSchema = z.object({
  channelId: z.string().uuid(),
  action: z.enum(['subscribe', 'unsubscribe']),
})

const error = (message: string, status: number, code: string) =>
  NextResponse.json({ success: false, error: message, code }, { status, headers: { 'Cache-Control': 'no-store' } })

async function stats(supabase: Awaited<ReturnType<typeof createClient>>, channelId: string, userId: string) {
  const { data, error: statsError } = await supabase.rpc('get_live_channel_stats', { p_channel_id: channelId })
  if (statsError) throw statsError
  const row = Array.isArray(data) ? data[0] : data
  return {
    followerCount: Number(row?.follower_count ?? 0),
    isFollowing: Boolean(row?.is_following),
    isOwner: channelId === userId,
  }
}

export async function GET(request: Request) {
  const channelId = new URL(request.url).searchParams.get('channelId') ?? ''
  if (!channelSchema.safeParse(channelId).success) return error('El canal solicitado no es válido.', 400, 'INVALID_CHANNEL_ID')
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) return error('No fue posible verificar la sesión.', 401, 'AUTHENTICATION_ERROR')
  if (!user) return error('Debes iniciar sesión.', 401, 'UNAUTHENTICATED')
  const access = await requireApiAccountAccess(supabase, user.id)
  if (!access.ok) return error('La cuenta no cumple los requisitos de seguridad.', access.status, access.code)
  try {
    return NextResponse.json({ success: true, ...(await stats(supabase, channelId, user.id)) }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return error('No fue posible consultar las suscripciones del canal. Comprueba que la migración de Credi LIVE esté aplicada.', 503, 'LIVE_SUBSCRIPTIONS_NOT_READY')
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return error('Origen no autorizado.', 403, 'CSRF_VALIDATION_FAILED')
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) return error('No fue posible verificar la sesión.', 401, 'AUTHENTICATION_ERROR')
  if (!user) return error('Debes iniciar sesión.', 401, 'UNAUTHENTICATED')
  const access = await requireApiAccountAccess(supabase, user.id)
  if (!access.ok) return error('La cuenta no cumple los requisitos de seguridad.', access.status, access.code)
  const limit = await distributedRateLimit(supabase, 'live-subscription:' + user.id + ':' + getRequestIp(request), { limit: 30, windowMs: 60_000 })
  if (!limit.success) return error('Demasiadas solicitudes. Inténtalo más tarde.', 429, 'RATE_LIMITED')
  const parsed = actionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return error('La acción de suscripción no es válida.', 400, 'INVALID_SUBSCRIPTION_ACTION')
  const { channelId, action } = parsed.data
  if (channelId === user.id) return error('No puedes suscribirte a tu propio canal.', 400, 'CANNOT_SUBSCRIBE_TO_SELF')

  if (action === 'subscribe') {
    const { error: insertError } = await supabase.from('chat_live_channel_subscriptions').upsert(
      { subscriber_id: user.id, channel_id: channelId },
      { onConflict: 'subscriber_id,channel_id', ignoreDuplicates: true },
    )
    if (insertError) return error('No fue posible suscribirte al canal. Comprueba que la migración de Credi LIVE esté aplicada.', 503, 'LIVE_SUBSCRIPTION_WRITE_FAILED')
  } else {
    const { error: deleteError } = await supabase.from('chat_live_channel_subscriptions').delete().eq('subscriber_id', user.id).eq('channel_id', channelId)
    if (deleteError) return error('No fue posible cancelar la suscripción.', 503, 'LIVE_UNSUBSCRIBE_FAILED')
  }

  try {
    return NextResponse.json({ success: true, ...(await stats(supabase, channelId, user.id)) }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return error('La suscripción se guardó, pero no se pudieron actualizar las estadísticas.', 503, 'LIVE_SUBSCRIPTION_STATS_FAILED')
  }
}
