import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json().catch(() => null) as { status?: 'scheduled' | 'live' | 'ended' | 'cancelled' } | null
    if (!body?.status) return NextResponse.json({ error: 'status is required' }, { status: 400 })
    const { data: session } = await supabase.from('credi_live_sessions').select('id,host_user_id,status').eq('id', id).maybeSingle()
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    if (session.host_user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const allowedTransitions: Record<string, string[]> = { scheduled: ['live', 'cancelled'], live: ['ended'], ended: [], cancelled: [] }
    if (!allowedTransitions[session.status]?.includes(body.status)) return NextResponse.json({ error: 'Invalid lifecycle transition' }, { status: 409 })
    const patch: Record<string, string> = { status: body.status }
    if (body.status === 'live') patch.started_at = new Date().toISOString()
    if (body.status === 'ended' || body.status === 'cancelled') patch.ended_at = new Date().toISOString()
    const { data, error } = await supabase.from('credi_live_sessions').update(patch).eq('id', id).select('id,title,status,started_at,ended_at').single()
    if (error) return NextResponse.json({ error: 'Unable to update session' }, { status: 500 })
    return NextResponse.json({ session: data })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
