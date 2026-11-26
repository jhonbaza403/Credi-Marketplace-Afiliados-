import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { getRequestIp } from '@/lib/security/auth'
import { isSameOrigin } from '@/lib/security/csrf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const postSchema = z.object({
  body_text: z.string().trim().max(6000).default(''),
  media: z.array(z.string().url().refine((value) => value.startsWith('https://'))).max(10).default([]),
  product_id: z.string().uuid().nullable().optional(),
}).strict().refine((value) => value.body_text.length > 0 || value.media.length > 0)

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!UUID.test(id)) return json({ error: 'INVALID_CHANNEL_ID' }, 400)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('broadcast_channel_posts')
    .select('id,channel_id,author_id,body_text,media,product_id,published_at,created_at')
    .eq('channel_id', id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50)

  if (error) return json({ error: 'CHANNEL_POSTS_UNAVAILABLE' }, 500)
  return json({ posts: data ?? [] })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return json({ error: 'CSRF_VALIDATION_FAILED' }, 403)
  if (!(request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) {
    return json({ error: 'JSON_REQUIRED' }, 415)
  }
  const { id } = await context.params
  if (!UUID.test(id)) return json({ error: 'INVALID_CHANNEL_ID' }, 400)

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return json({ error: 'UNAUTHORIZED' }, 401)

  const limit = await distributedRateLimit(
    supabase,
    `channel-post:${user.id}:${getRequestIp(request)}`,
    { limit: 20, windowMs: 60_000 },
  )
  if (!limit.success) return json({ error: 'RATE_LIMITED' }, 429)

  let raw: unknown
  try { raw = await request.json() } catch { return json({ error: 'INVALID_JSON' }, 400) }
  const parsed = postSchema.safeParse(raw)
  if (!parsed.success) return json({ error: 'INVALID_CHANNEL_POST', issues: parsed.error.issues.map((item) => ({ path: item.path, code: item.code })) }, 400)

  const { data, error } = await supabase
    .from('broadcast_channel_posts')
    .insert({
      channel_id: id,
      author_id: user.id,
      body_text: parsed.data.body_text,
      media: parsed.data.media.map((url) => ({ type: 'image_or_video', url })),
      product_id: parsed.data.product_id ?? null,
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .select('id,channel_id,author_id,body_text,media,product_id,published_at,created_at')
    .single()

  if (error) {
    console.error('[channels/posts][POST]', error)
    return json({ error: 'CHANNEL_POST_CREATE_FAILED' }, 403)
  }
  return json({ success: true, post: data }, 201)
}
