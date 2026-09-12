import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const allowed = new Set(['view','product_view','add_to_cart','checkout_start','purchase','reaction','chat'])

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const body = await request.json().catch(() => null) as { session_id?: string; event_type?: string; product_id?: string; order_id?: string; metadata?: Record<string, unknown> } | null
    if (!body?.session_id || !allowed.has(body.event_type ?? '')) return NextResponse.json({ error: 'Invalid live event' }, { status: 400 })

    const { data: session } = await supabase.from('credi_live_sessions').select('id,status').eq('id', body.session_id).maybeSingle()
    if (!session || !['scheduled', 'live'].includes(session.status)) return NextResponse.json({ error: 'Live session unavailable' }, { status: 404 })
    if (body.order_id && !user) return NextResponse.json({ error: 'Authentication required for purchase events' }, { status: 401 })

    const { error } = await supabase.from('credi_live_events').insert({
      session_id: body.session_id,
      event_type: body.event_type,
      user_id: user?.id ?? null,
      product_id: body.product_id ?? null,
      order_id: body.order_id ?? null,
      metadata: body.metadata ?? {},
    })
    if (error) return NextResponse.json({ error: 'Unable to record live event' }, { status: 500 })
    return NextResponse.json({ recorded: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
