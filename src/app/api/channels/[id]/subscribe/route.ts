import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSameOrigin } from '@/lib/security/csrf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!UUID.test(id)) return json({ error: 'INVALID_CHANNEL_ID' }, 400)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json({ authenticated: false, state: 'not_joined' })

  const { data, error } = await supabase
    .from('broadcast_channel_members')
    .select('state,role')
    .eq('channel_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return json({ error: 'CHANNEL_MEMBERSHIP_UNAVAILABLE' }, 500)
  return json({ authenticated: true, state: data?.state ?? 'not_joined', role: data?.role ?? null })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return json({ error: 'CSRF_VALIDATION_FAILED' }, 403)
  const { id } = await context.params
  if (!UUID.test(id)) return json({ error: 'INVALID_CHANNEL_ID' }, 400)

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return json({ error: 'UNAUTHORIZED' }, 401)

  const { data: channel, error: channelError } = await supabase
    .from('broadcast_channels')
    .select('id,status,visibility,join_policy,owner_id')
    .eq('id', id)
    .maybeSingle()
  if (channelError) return json({ error: 'CHANNEL_LOOKUP_FAILED' }, 500)
  if (!channel || channel.status !== 'active') return json({ error: 'CHANNEL_NOT_FOUND' }, 404)
  if (channel.owner_id === user.id) return json({ state: 'active', role: 'owner' })
  if (channel.visibility === 'private' || channel.join_policy === 'invite_only') {
    return json({ error: 'CHANNEL_INVITE_REQUIRED' }, 403)
  }

  const { data: current, error: currentError } = await supabase
    .from('broadcast_channel_members')
    .select('state,role')
    .eq('channel_id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (currentError) return json({ error: 'CHANNEL_MEMBERSHIP_UNAVAILABLE' }, 500)
  if (current?.state === 'active' || current?.state === 'pending' || current?.state === 'muted') {
    return json({ success: true, state: current.state, role: current.role, already_subscribed: true })
  }
  if (current && current.role !== 'subscriber') return json({ error: 'CHANNEL_MEMBERSHIP_PROTECTED' }, 409)

  if (current?.state === 'left') {
    const { error: deleteError } = await supabase
      .from('broadcast_channel_members')
      .delete()
      .eq('channel_id', id)
      .eq('user_id', user.id)
      .eq('role', 'subscriber')
    if (deleteError) return json({ error: 'CHANNEL_REJOIN_FAILED' }, 500)
  }

  const state = channel.join_policy === 'approval' ? 'pending' : 'active'
  const { data, error } = await supabase
    .from('broadcast_channel_members')
    .insert({
      channel_id: id,
      user_id: user.id,
      role: 'subscriber',
      state,
      joined_at: state === 'active' ? new Date().toISOString() : null,
    })
    .select('state,role')
    .single()

  if (error) {
    console.error('[channels/subscribe][POST]', error)
    return json({ error: 'CHANNEL_SUBSCRIBE_FAILED' }, 500)
  }
  return json({ success: true, state: data.state, role: data.role }, 201)
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return json({ error: 'CSRF_VALIDATION_FAILED' }, 403)
  const { id } = await context.params
  if (!UUID.test(id)) return json({ error: 'INVALID_CHANNEL_ID' }, 400)

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return json({ error: 'UNAUTHORIZED' }, 401)

  const { error } = await supabase
    .from('broadcast_channel_members')
    .delete()
    .eq('channel_id', id)
    .eq('user_id', user.id)
  if (error) return json({ error: 'CHANNEL_LEAVE_FAILED' }, 500)
  return json({ success: true, state: 'not_joined' })
}
