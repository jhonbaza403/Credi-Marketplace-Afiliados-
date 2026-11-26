import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isSameOrigin } from '@/lib/security/csrf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const schema = z.object({ state: z.enum(['active', 'muted', 'left']) }).strict()
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

export async function PATCH(request: Request, context: { params: Promise<{ id: string; userId: string }> }) {
  if (!isSameOrigin(request)) return json({ error: 'CSRF_VALIDATION_FAILED' }, 403)
  const { id, userId } = await context.params
  if (!UUID.test(id) || !UUID.test(userId)) return json({ error: 'INVALID_MEMBER_REFERENCE' }, 400)
  if (!(request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) {
    return json({ error: 'JSON_REQUIRED' }, 415)
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return json({ error: 'UNAUTHORIZED' }, 401)
  if (user.id === userId) return json({ error: 'MANAGERS_CANNOT_MODERATE_THEMSELVES' }, 409)

  let raw: unknown
  try { raw = await request.json() } catch { return json({ error: 'INVALID_JSON' }, 400) }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return json({ error: 'INVALID_MEMBER_STATE' }, 400)

  const { data: channel, error: channelError } = await supabase
    .from('broadcast_channels')
    .select('owner_id')
    .eq('id', id)
    .maybeSingle()
  if (channelError) return json({ error: 'CHANNEL_LOOKUP_FAILED' }, 500)
  if (!channel) return json({ error: 'CHANNEL_NOT_FOUND' }, 404)

  let manager = channel.owner_id === user.id
  if (!manager) {
    const { data: membership, error } = await supabase
      .from('broadcast_channel_members')
      .select('role,state')
      .eq('channel_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) return json({ error: 'CHANNEL_MEMBERSHIP_UNAVAILABLE' }, 500)
    manager = membership?.role === 'admin' && membership.state === 'active'
  }
  if (!manager) return json({ error: 'FORBIDDEN' }, 403)

  const memberUpdate: { state: 'active' | 'muted' | 'left'; joined_at?: string; updated_at: string } = {
    state: parsed.data.state,
    updated_at: new Date().toISOString(),
  }
  if (parsed.data.state === 'active') memberUpdate.joined_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('broadcast_channel_members')
    .update(memberUpdate)
    .eq('channel_id', id)
    .eq('user_id', userId)
    .eq('role', 'subscriber')
    .select('user_id,role,state,joined_at')
    .maybeSingle()

  if (error) {
    console.error('[channels/members][PATCH]', error)
    return json({ error: 'CHANNEL_MEMBER_UPDATE_FAILED' }, 500)
  }
  if (!data) return json({ error: 'SUBSCRIBER_NOT_FOUND_OR_PROTECTED' }, 404)
  return json({ success: true, member: data })
}
