import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function validUUID(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) }
function validCountry(value: unknown): string | null { if (typeof value !== 'string') return null; const v = value.trim().toUpperCase(); return /^[A-Z]{2}$/.test(v) ? v : null }

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const { data: requests, error } = await supabase.from('credi_locker_requests').select('id,order_id,locker_code,pickup_country,pickup_city,pickup_address,status').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
  if (error) return NextResponse.json({ error: 'LOCKER_REQUESTS_UNAVAILABLE' }, { status: 500 })
  return NextResponse.json({ requests: requests ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const body = await request.json().catch(() => null) as { order_id?: unknown; pickup_country?: unknown; pickup_city?: unknown; pickup_address?: unknown } | null
  const country = validCountry(body?.pickup_country)
  const city = typeof body?.pickup_city === 'string' ? body.pickup_city.trim().slice(0, 160) : ''
  const address = typeof body?.pickup_address === 'string' ? body.pickup_address.trim().slice(0, 300) : ''
  const orderId = typeof body?.order_id === 'string' && validUUID(body.order_id.trim()) ? body.order_id.trim() : null
  if (!country || city.length < 2 || address.length < 5) return NextResponse.json({ error: 'INVALID_PICKUP_DATA' }, { status: 400 })
  if (body?.order_id && !orderId) return NextResponse.json({ error: 'INVALID_ORDER_ID' }, { status: 400 })
  if (orderId) {
    const { data: order } = await supabase.from('orders').select('id,status').eq('id', orderId).eq('buyer_id', user.id).maybeSingle()
    if (!order) return NextResponse.json({ error: 'ORDER_NOT_FOUND' }, { status: 404 })
    if (!['paid','processing','shipped'].includes(order.status)) return NextResponse.json({ error: 'ORDER_NOT_ELIGIBLE_FOR_LOCKER' }, { status: 409 })
  }
  const { data: row, error } = await supabase.from('credi_locker_requests').insert({ user_id: user.id, order_id: orderId, pickup_country: country, pickup_city: city, pickup_address: address, status: 'pending', metadata: { module: 'CREDI-LOCKER', assignment: 'pending' } }).select('id,order_id,locker_code,pickup_country,pickup_city,pickup_address,status').single()
  if (error || !row) return NextResponse.json({ error: 'LOCKER_REQUEST_CREATE_FAILED' }, { status: 500 })
  return NextResponse.json({ request: row }, { status: 201 })
}
