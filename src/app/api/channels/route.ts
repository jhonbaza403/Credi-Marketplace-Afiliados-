import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { getRequestIp } from '@/lib/security/auth'
import { isSameOrigin } from '@/lib/security/csrf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const channelSchema = z.object({
  handle: z.string().trim().toLowerCase().min(3).max(40).regex(/^[a-z0-9][a-z0-9_-]{2,39}$/),
  title: z.string().trim().min(3).max(120),
  description: z.string().max(1200).default(''),
  visibility: z.enum(['public', 'unlisted', 'private']).default('public'),
  join_policy: z.enum(['open', 'approval', 'invite_only']).default('open'),
}).strict()

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('broadcast_channels')
    .select('id,handle,title,description,avatar_url,visibility,join_policy,created_at,updated_at')
    .eq('status', 'active')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(60)

  if (error) {
    console.error('[channels][GET]', error)
    return json({ error: 'CHANNEL_DIRECTORY_UNAVAILABLE' }, 500)
  }
  return json({ channels: data ?? [] })
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'CSRF_VALIDATION_FAILED' }, 403)
  if (!(request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) {
    return json({ error: 'JSON_REQUIRED' }, 415)
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return json({ error: 'UNAUTHORIZED' }, 401)

  const limit = await distributedRateLimit(
    supabase,
    `channels-create:${user.id}:${getRequestIp(request)}`,
    { limit: 3, windowMs: 60_000 },
  )
  if (!limit.success) return json({ error: 'RATE_LIMITED' }, 429)

  let raw: unknown
  try { raw = await request.json() } catch { return json({ error: 'INVALID_JSON' }, 400) }
  const parsed = channelSchema.safeParse(raw)
  if (!parsed.success) return json({ error: 'INVALID_CHANNEL', issues: parsed.error.issues.map((item) => ({ path: item.path, code: item.code })) }, 400)
  if (parsed.data.visibility === 'private' && parsed.data.join_policy !== 'invite_only') {
    return json({ error: 'PRIVATE_CHANNEL_REQUIRES_INVITES' }, 400)
  }
  if (parsed.data.visibility !== 'private' && parsed.data.join_policy === 'invite_only') {
    return json({ error: 'INVITE_ONLY_CHANNELS_MUST_BE_PRIVATE' }, 400)
  }

  const { data: channelId, error } = await supabase.rpc('create_broadcast_channel', {
    p_handle: parsed.data.handle,
    p_title: parsed.data.title,
    p_description: parsed.data.description,
    p_visibility: parsed.data.visibility,
    p_join_policy: parsed.data.join_policy,
  })

  if (error || typeof channelId !== 'string') {
    if (error?.code === '23505') return json({ error: 'CHANNEL_HANDLE_TAKEN' }, 409)
    console.error('[channels][POST]', error)
    return json({ error: 'CHANNEL_CREATE_FAILED' }, 500)
  }

  const { data: channel, error: lookupError } = await supabase
    .from('broadcast_channels')
    .select('id,handle,title,description,visibility,join_policy,created_at')
    .eq('id', channelId)
    .single()
  if (lookupError || !channel) return json({ error: 'CHANNEL_CREATED_LOOKUP_FAILED' }, 500)

  return json({ success: true, channel }, 201)
}
