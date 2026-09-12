import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const transitions: Record<string, string[]> = {
  reserved: ['loaded', 'expired'],
  loaded: ['ready_for_pickup', 'incident'],
  ready_for_pickup: ['collected', 'expired', 'incident'],
  collected: [], expired: [], incident: [],
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json().catch(() => null) as { shipment_id?: string; status?: string } | null
    if (!body?.shipment_id || !body.status) return NextResponse.json({ error: 'shipment_id and status are required' }, { status: 400 })
    const { data: shipment } = await supabase.from('credi_locker_shipments').select('id,order_id,status').eq('id', body.shipment_id).maybeSingle()
    if (!shipment) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    if (!transitions[shipment.status]?.includes(body.status)) return NextResponse.json({ error: 'Invalid locker transition' }, { status: 409 })
    const { data: order } = await supabase.from('orders').select('id,user_id').eq('id', shipment.order_id).maybeSingle()
    if (!order || order.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const patch: Record<string, string> = { status: body.status }
    if (body.status === 'ready_for_pickup') patch.ready_at = new Date().toISOString()
    if (body.status === 'collected') patch.collected_at = new Date().toISOString()
    const { data, error } = await supabase.from('credi_locker_shipments').update(patch).eq('id', shipment.id).select('id,locker_id,order_id,status,ready_at,collected_at').single()
    if (error) return NextResponse.json({ error: 'Unable to update locker shipment' }, { status: 500 })
    return NextResponse.json({ shipment: data })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
