import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json().catch(() => null) as { escrow_id?: string; reason?: string; evidence?: Record<string, unknown> } | null
    if (!body?.escrow_id || typeof body.reason !== 'string' || !body.reason.trim()) return NextResponse.json({ error: 'escrow_id and reason are required' }, { status: 400 })

    const { data: escrow } = await supabase.from('credi_escrows').select('id,order_id,status').eq('id', body.escrow_id).maybeSingle()
    if (!escrow) return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
    const { data: order } = await supabase.from('orders').select('id,user_id').eq('id', escrow.order_id).maybeSingle()
    if (!order || order.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!['funded', 'shipping', 'delivered'].includes(escrow.status)) return NextResponse.json({ error: 'Escrow is not disputable in its current state' }, { status: 409 })

    const { error: eventError } = await supabase.from('credi_escrow_events').insert({
      escrow_id: escrow.id,
      event_type: 'dispute_opened',
      evidence: { reason: body.reason.trim().slice(0, 4000), ...(body.evidence ?? {}) },
      actor_id: user.id,
    })
    if (eventError) return NextResponse.json({ error: 'Unable to open dispute' }, { status: 500 })
    const { error: updateError } = await supabase.from('credi_escrows').update({ status: 'disputed', updated_at: new Date().toISOString() }).eq('id', escrow.id)
    if (updateError) return NextResponse.json({ error: 'Unable to mark escrow disputed' }, { status: 500 })
    return NextResponse.json({ disputed: true, escrow_id: escrow.id })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
