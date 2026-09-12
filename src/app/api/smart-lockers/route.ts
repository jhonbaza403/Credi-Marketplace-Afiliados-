import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('credi_smart_lockers').select('id,name,address,status,capacity,partner_store_id').eq('status', 'active').order('name')
  if (error) return NextResponse.json({ error: 'Unable to load lockers' }, { status: 500 })
  return NextResponse.json({ lockers: data ?? [] })
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json().catch(() => null) as { locker_id?: string; order_id?: string } | null
    if (!body?.locker_id || !body?.order_id) return NextResponse.json({ error: 'locker_id and order_id are required' }, { status: 400 })

    const { data: order } = await supabase.from('orders').select('id,user_id').eq('id', body.order_id).maybeSingle()
    if (!order || order.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const token = crypto.randomUUID()
    const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    const hash = Array.from(new Uint8Array(tokenHash), (b) => b.toString(16).padStart(2, '0')).join('')

    const { data, error } = await supabase.from('credi_locker_shipments').insert({ locker_id: body.locker_id, order_id: body.order_id, status: 'reserved', pickup_token_hash: hash }).select('id,locker_id,order_id,status').single()
    if (error) return NextResponse.json({ error: 'Unable to reserve locker' }, { status: 500 })
    return NextResponse.json({ shipment: data, pickup_token: token })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
