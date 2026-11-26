import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSameOrigin } from '@/lib/security/csrf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

async function resolveCreator(handleInput: string) {
  const handle = handleInput.trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9_]{2,29}$/.test(handle)) return { error: 'INVALID_CREATOR_HANDLE' as const }
  return { handle }
}

export async function GET(_: Request, context: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = await context.params
  const resolved = await resolveCreator(raw)
  if ('error' in resolved) return json({ error: resolved.error }, 400)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json({ following: false, authenticated: false })

  const { data: creator, error: creatorError } = await supabase
    .from('creator_profiles')
    .select('user_id,allow_followers,is_published,visibility')
    .eq('handle', resolved.handle)
    .maybeSingle()
  if (creatorError) return json({ error: 'CREATOR_LOOKUP_FAILED' }, 500)
  if (!creator || !creator.is_published) return json({ error: 'CREATOR_NOT_FOUND' }, 404)

  const { data, error } = await supabase
    .from('creator_follows')
    .select('creator_user_id')
    .eq('creator_user_id', creator.user_id)
    .eq('follower_user_id', user.id)
    .maybeSingle()
  if (error) return json({ error: 'FOLLOW_STATUS_UNAVAILABLE' }, 500)
  return json({ following: Boolean(data), authenticated: true })
}

export async function POST(request: Request, context: { params: Promise<{ handle: string }> }) {
  if (!isSameOrigin(request)) return json({ error: 'CSRF_VALIDATION_FAILED' }, 403)
  const { handle: raw } = await context.params
  const resolved = await resolveCreator(raw)
  if ('error' in resolved) return json({ error: resolved.error }, 400)

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return json({ error: 'UNAUTHORIZED' }, 401)

  const { data: creator, error: creatorError } = await supabase
    .from('creator_profiles')
    .select('user_id,allow_followers,is_published,visibility')
    .eq('handle', resolved.handle)
    .maybeSingle()
  if (creatorError) return json({ error: 'CREATOR_LOOKUP_FAILED' }, 500)
  if (!creator || !creator.is_published || creator.visibility !== 'public') return json({ error: 'CREATOR_NOT_FOLLOWABLE' }, 404)
  if (!creator.allow_followers) return json({ error: 'FOLLOWING_DISABLED' }, 403)
  if (creator.user_id === user.id) return json({ error: 'CANNOT_FOLLOW_SELF' }, 409)

  const { error } = await supabase.from('creator_follows').upsert({
    creator_user_id: creator.user_id,
    follower_user_id: user.id,
  }, { onConflict: 'creator_user_id,follower_user_id', ignoreDuplicates: true })
  if (error) return json({ error: 'FOLLOW_FAILED' }, 500)
  return json({ success: true, following: true }, 201)
}

export async function DELETE(request: Request, context: { params: Promise<{ handle: string }> }) {
  if (!isSameOrigin(request)) return json({ error: 'CSRF_VALIDATION_FAILED' }, 403)
  const { handle: raw } = await context.params
  const resolved = await resolveCreator(raw)
  if ('error' in resolved) return json({ error: resolved.error }, 400)

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return json({ error: 'UNAUTHORIZED' }, 401)

  const { data: creator, error: creatorError } = await supabase
    .from('creator_profiles')
    .select('user_id')
    .eq('handle', resolved.handle)
    .maybeSingle()
  if (creatorError) return json({ error: 'CREATOR_LOOKUP_FAILED' }, 500)
  if (!creator) return json({ error: 'CREATOR_NOT_FOUND' }, 404)

  const { error } = await supabase
    .from('creator_follows')
    .delete()
    .eq('creator_user_id', creator.user_id)
    .eq('follower_user_id', user.id)
  if (error) return json({ error: 'UNFOLLOW_FAILED' }, 500)
  return json({ success: true, following: false })
}
