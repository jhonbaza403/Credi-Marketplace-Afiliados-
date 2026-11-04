import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { isSameOrigin } from '@/lib/security/csrf'
import { isFeedInterestId, type FeedRankingMode } from '@/lib/social/feed-ranking'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const defaults = { interests: [] as string[], feed_mode: 'chronological' as FeedRankingMode }

function jsonError(error: string, status: number, code: string) {
  return NextResponse.json({ error, code }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET() {
  const supabase = await createClient()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) return jsonError('UNAUTHORIZED', 401, 'UNAUTHENTICATED')

  const { data, error } = await supabase.from('social_feed_preferences')
    .select('interests,feed_mode').eq('user_id', auth.user.id).maybeSingle()

  if (error) {
    console.error('[social:preferences:read]', error)
    return jsonError('FEED_PREFERENCES_UNAVAILABLE', 503, 'DEPENDENCY_UNAVAILABLE')
  }

  const interests = Array.isArray(data?.interests)
    ? data.interests.filter((value: unknown): value is string => typeof value === 'string' && isFeedInterestId(value))
    : []
  const feedMode: FeedRankingMode = data?.feed_mode === 'interests' && interests.length > 0
    ? 'interests'
    : 'chronological'

  return NextResponse.json(
    { preferences: data ? { interests, feed_mode: feedMode } : defaults },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return jsonError('Origen no autorizado.', 403, 'CSRF_VALIDATION_FAILED')
  if (!(request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) {
    return jsonError('Content-Type debe ser application/json.', 415, 'UNSUPPORTED_MEDIA_TYPE')
  }

  const supabase = await createClient()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) return jsonError('UNAUTHORIZED', 401, 'UNAUTHENTICATED')
  const limit = await distributedRateLimit(supabase, 'social:preferences:' + auth.user.id, { limit: 20, windowMs: 60_000 })
  if (!limit.success) return jsonError('Demasiadas actualizaciones de preferencias.', 429, 'RATE_LIMITED')

  let input: unknown
  try { input = await request.json() } catch { return jsonError('JSON inválido.', 400, 'INVALID_JSON') }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return jsonError('Las preferencias no tienen un formato válido.', 400, 'INVALID_PREFERENCES')
  }

  const body = input as Record<string, unknown>
  if (!Array.isArray(body.interests) || body.interests.length > 8 ||
      !body.interests.every((value) => typeof value === 'string' && isFeedInterestId(value))) {
    return jsonError('Selecciona hasta ocho temas disponibles.', 400, 'INVALID_INTERESTS')
  }
  const interests = [...new Set(body.interests as string[])]
  if (body.feed_mode !== 'chronological' && body.feed_mode !== 'interests') {
    return jsonError('El modo de orden no es válido.', 400, 'INVALID_FEED_MODE')
  }
  const feedMode: FeedRankingMode = body.feed_mode === 'interests' && interests.length > 0
    ? 'interests'
    : 'chronological'

  const { data, error } = await supabase.from('social_feed_preferences').upsert({
    user_id: auth.user.id,
    interests,
    feed_mode: feedMode,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' }).select('interests,feed_mode,updated_at').single()

  if (error || !data) {
    console.error('[social:preferences:save]', error)
    return jsonError('No fue posible guardar tus preferencias.', 503, 'PREFERENCES_SAVE_FAILED')
  }
  return NextResponse.json({ preferences: data }, { headers: { 'Cache-Control': 'no-store' } })
}
