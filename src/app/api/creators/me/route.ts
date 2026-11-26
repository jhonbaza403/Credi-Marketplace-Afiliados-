import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isSameOrigin } from '@/lib/security/csrf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const httpsUrl = z.string().url().max(2048).refine((value) => value.startsWith('https://'), 'HTTPS_REQUIRED').nullable().optional()
const creatorProfileSchema = z.object({
  handle: z.string().trim().toLowerCase().min(3).max(30).regex(/^[a-z0-9][a-z0-9_]{2,29}$/),
  display_name: z.string().trim().min(2).max(100),
  bio: z.string().max(1800).default(''),
  category: z.string().trim().min(2).max(80).nullable().optional(),
  avatar_url: httpsUrl,
  cover_url: httpsUrl,
  website_url: httpsUrl,
  links: z.record(z.string(), z.string().url().refine((value) => value.startsWith('https://'))).optional(),
  visibility: z.enum(['public', 'unlisted', 'private']).default('public'),
  is_published: z.boolean().default(true),
  allow_followers: z.boolean().default(true),
}).strict()

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return json({ error: 'UNAUTHORIZED' }, 401)

  const { data, error } = await supabase
    .from('creator_profiles')
    .select('user_id,handle,display_name,bio,category,avatar_url,cover_url,website_url,links,visibility,is_published,allow_followers,created_at,updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return json({ error: 'CREATOR_PROFILE_UNAVAILABLE' }, 500)
  return json({ profile: data })
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'CSRF_VALIDATION_FAILED' }, 403)
  if (!(request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) {
    return json({ error: 'JSON_REQUIRED' }, 415)
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return json({ error: 'UNAUTHORIZED' }, 401)

  let raw: unknown
  try { raw = await request.json() } catch { return json({ error: 'INVALID_JSON' }, 400) }
  const parsed = creatorProfileSchema.safeParse(raw)
  if (!parsed.success) {
    return json({ error: 'INVALID_CREATOR_PROFILE', issues: parsed.error.issues.map((issue) => ({ path: issue.path, code: issue.code })) }, 400)
  }

  const { data, error } = await supabase
    .from('creator_profiles')
    .upsert({ user_id: user.id, ...parsed.data }, { onConflict: 'user_id' })
    .select('user_id,handle,display_name,bio,category,avatar_url,cover_url,website_url,links,visibility,is_published,allow_followers,created_at,updated_at')
    .single()

  if (error) {
    if (error.code === '23505') return json({ error: 'CREATOR_HANDLE_TAKEN' }, 409)
    console.error('[creators/me][PUT]', error)
    return json({ error: 'CREATOR_PROFILE_SAVE_FAILED' }, 500)
  }

  return json({ success: true, profile: data })
}
