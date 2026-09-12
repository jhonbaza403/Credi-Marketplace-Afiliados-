import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { shouldReleaseEscrow } from '@/lib/credi-autonomous'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null) as { escrow_id?: string } | null
    if (!body?.escrow_id) return NextResponse.json({ error: 'escrow_id is required' }, { status: 400 })

    const { data: escrow, error } = await supabase.from('credi_escrows').select('id,order_id,status,dispute_deadline').eq('id', body.escrow_id).maybeSingle()
    if (error || !escrow) return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })

    const { data: order } = await supabase.from('orders').select('id,user_id').eq('id', escrow.order_id).maybeSingle()
    if (!order || order.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { count } = await supabase.from('credi_escrow_events').select('id', { count: 'exact', head: true }).eq('escrow_id', escrow.id).eq('event_type', 'dispute_opened')
    const delivered = escrow.status === 'delivered' || escrow.status === 'disputed'
    const disputeOpen = (count ?? 0) > 0
    const allowed = shouldReleaseEscrow({ delivered, disputeOpen, disputeDeadline: escrow.dispute_deadline })
    if (!allowed) return NextResponse.json({ error: 'Escrow is not eligible for automatic release' }, { status: 409 })

    const { data: updated, error: updateError } = await supabase.from('credi_escrows').update({ status: 'released', release_reason: 'deterministic_release_policy', updated_at: new Date().toISOString() }).eq('id', escrow.id).eq('status', 'delivered').select('id,status').maybeSingle()
    if (updateError || !updated) return NextResponse.json({ error: 'Escrow could not be released' }, { status: 409 })

    await supabase.from('credi_escrow_events').insert({ escrow_id: escrow.id, event_type: 'released', evidence: { policy: 'deterministic_release_policy' }, actor_id: user.id })
    return NextResponse.json({ escrow: updated })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
