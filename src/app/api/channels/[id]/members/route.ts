import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!UUID.test(id)) return json({ error: 'INVALID_CHANNEL_ID' }, 400)

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return json({ error: 'UNAUTHORIZED' }, 401)

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

  const { data, error } = await supabase
    .from('broadcast_channel_members')
    .select('user_id,role,state,joined_at,created_at')
    .eq('channel_id', id)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return json({ error: 'CHANNEL_MEMBERS_UNAVAILABLE' }, 500)
  return json({ members: data ?? [] })
}
