import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { getRequestIp } from '@/lib/security/auth'
import { isSameOrigin } from '@/lib/security/csrf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{40,64}$/) }).strict()
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

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
    `channel-invite-accept:${user.id}:${getRequestIp(request)}`,
    { limit: 10, windowMs: 60_000 },
  )
  if (!limit.success) return json({ error: 'RATE_LIMITED' }, 429)

  let raw: unknown
  try { raw = await request.json() } catch { return json({ error: 'INVALID_JSON' }, 400) }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return json({ error: 'INVALID_INVITE' }, 400)

  const tokenHash = createHash('sha256').update(parsed.data.token, 'utf8').digest('hex')
  const { data: channelId, error } = await supabase.rpc('accept_broadcast_channel_invite', {
    p_token_hash: tokenHash,
  })

  if (error || typeof channelId !== 'string') {
    const message = error?.message ?? ''
    if (/INVITE_EXPIRED_OR_USED|INVITE_NOT_FOR_THIS_USER|CHANNEL_NOT_INVITE_ACCESSIBLE|INVALID_INVITE/i.test(message)) {
      return json({ error: 'INVITE_INVALID_OR_EXPIRED' }, 410)
    }
    console.error('[channels/invites/accept][POST]', error)
    return json({ error: 'INVITE_ACCEPT_FAILED' }, 500)
  }

  const { data: channel, error: channelError } = await supabase
    .from('broadcast_channels')
    .select('handle')
    .eq('id', channelId)
    .single()
  if (channelError || !channel) return json({ error: 'CHANNEL_LOOKUP_FAILED' }, 500)

  return json({ success: true, handle: channel.handle }, 200)
}
