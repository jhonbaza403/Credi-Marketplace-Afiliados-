import { createHash, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { getRequestIp } from '@/lib/security/auth'
import { isSameOrigin } from '@/lib/security/csrf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const schema = z.object({ expires_in_hours: z.number().int().min(1).max(168).default(72) }).strict()

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return json({ error: 'CSRF_VALIDATION_FAILED' }, 403)
  const { id } = await context.params
  if (!UUID.test(id)) return json({ error: 'INVALID_CHANNEL_ID' }, 400)

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return json({ error: 'UNAUTHORIZED' }, 401)

  const limit = await distributedRateLimit(
    supabase,
    `channel-invites:${user.id}:${getRequestIp(request)}`,
    { limit: 10, windowMs: 60_000 },
  )
  if (!limit.success) return json({ error: 'RATE_LIMITED' }, 429)

  let raw: unknown
  try { raw = await request.json() } catch { return json({ error: 'INVALID_JSON' }, 400) }
  const parsed = schema.safeParse(raw ?? {})
  if (!parsed.success) return json({ error: 'INVALID_INVITE_EXPIRY' }, 400)

  const { data: channel, error: channelError } = await supabase
    .from('broadcast_channels')
    .select('id,owner_id,visibility,join_policy,status')
    .eq('id', id)
    .maybeSingle()
  if (channelError) return json({ error: 'CHANNEL_LOOKUP_FAILED' }, 500)
  if (!channel || channel.status !== 'active') return json({ error: 'CHANNEL_NOT_FOUND' }, 404)
  if (channel.visibility !== 'private' || channel.join_policy !== 'invite_only') {
    return json({ error: 'INVITES_ONLY_FOR_PRIVATE_CHANNELS' }, 409)
  }

  let manager = channel.owner_id === user.id
  if (!manager) {
    const { data: member, error: memberError } = await supabase
      .from('broadcast_channel_members')
      .select('role,state')
      .eq('channel_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (memberError) return json({ error: 'CHANNEL_MEMBERSHIP_UNAVAILABLE' }, 500)
    manager = member?.role === 'admin' && member.state === 'active'
  }
  if (!manager) return json({ error: 'FORBIDDEN' }, 403)

  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex')
  const expiresAt = new Date(Date.now() + parsed.data.expires_in_hours * 60 * 60 * 1000).toISOString()

  const admin = createAdminClient()
  const { error: insertError } = await admin.from('broadcast_channel_invites').insert({
    channel_id: id,
    token_hash: tokenHash,
    invited_by: user.id,
    expires_at: expiresAt,
  })
  if (insertError) {
    console.error('[channels/invites][POST]', insertError)
    return json({ error: 'INVITE_CREATE_FAILED' }, 500)
  }

  return json({
    success: true,
    expires_at: expiresAt,
    invite_url: `/canales/aceptar?token=${encodeURIComponent(token)}`,
  }, 201)
}
