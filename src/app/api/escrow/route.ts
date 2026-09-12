import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function validUUID(value: unknown) { return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim()) }

async function isPlatformAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from('profiles').select('role,platform_owner').eq('id', userId).maybeSingle()
  return data?.role === 'admin' || data?.platform_owner === true
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const admin = await isPlatformAdmin(supabase, user.id)
  const query = supabase.from('credi_escrow_cases').select('id,order_id,buyer_id,seller_id,amount,currency,status,release_condition,provider').order('created_at', { ascending: false }).limit(100)
  if (!admin) query.or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
  const { data: cases, error } = await query
  if (error) return NextResponse.json({ error: 'ESCROW_CASES_UNAVAILABLE' }, { status: 500 })
  return NextResponse.json({ cases: cases ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const body = await request.json().catch(() => null) as { order_id?: unknown } | null
  const orderId = typeof body?.order_id === 'string' ? body.order_id.trim() : ''
  if (!validUUID(orderId)) return NextResponse.json({ error: 'INVALID_ORDER_ID' }, { status: 400 })
  const { data: order } = await supabase.from('orders').select('id,buyer_id,total_amount,currency,status').eq('id', orderId).eq('buyer_id', user.id).maybeSingle()
  if (!order) return NextResponse.json({ error: 'ORDER_NOT_FOUND' }, { status: 404 })
  if (!['paid','processing','shipped','delivered'].includes(order.status)) return NextResponse.json({ error: 'ORDER_NOT_ELIGIBLE_FOR_ESCROW' }, { status: 409 })
  const { data: item } = await supabase.from('order_items').select('store_id').eq('order_id', orderId).limit(1).maybeSingle()
  let sellerId: string | null = null
  if (item?.store_id) {
    const { data: store } = await supabase.from('stores').select('vendor_id').eq('id', item.store_id).maybeSingle()
    sellerId = store?.vendor_id ?? null
  }
  const funded = order.status !== 'pending'
  const { data: existing } = await supabase.from('credi_escrow_cases').select('id,status').eq('order_id', orderId).maybeSingle()
  if (existing) return NextResponse.json({ error: 'ESCROW_ALREADY_EXISTS', case: existing }, { status: 409 })
  const { data: escrowCase, error } = await supabase.from('credi_escrow_cases').insert({ order_id: orderId, buyer_id: user.id, seller_id: sellerId, amount: Number(order.total_amount), currency: String(order.currency || 'USD').trim().toUpperCase(), status: funded ? 'funded' : 'requested', funded_at: funded ? new Date().toISOString() : null, metadata: { module: 'CREDI-ESCROW', source: 'verified_order_payment' } }).select('id,order_id,buyer_id,seller_id,amount,currency,status,release_condition,provider').single()
  if (error || !escrowCase) return NextResponse.json({ error: 'ESCROW_CREATE_FAILED' }, { status: 500 })
  return NextResponse.json({ case: escrowCase, message: funded ? 'Expediente creado sobre una orden ya pagada y verificada.' : 'Expediente creado; la financiación se confirmará con el flujo de pagos verificado.' }, { status: 201 })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!await isPlatformAdmin(supabase, user.id)) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  const body = await request.json().catch(() => null) as { case_id?: unknown; action?: unknown } | null
  const caseId = typeof body?.case_id === 'string' ? body.case_id.trim() : ''
  const action = body?.action === 'release' || body?.action === 'refund' ? body.action : ''
  if (!validUUID(caseId) || !action) return NextResponse.json({ error: 'INVALID_ESCROW_ACTION' }, { status: 400 })
  const { data: current } = await supabase.from('credi_escrow_cases').select('id,order_id,status').eq('id', caseId).maybeSingle()
  if (!current) return NextResponse.json({ error: 'ESCROW_NOT_FOUND' }, { status: 404 })
  if (action === 'release') {
    const { data: order } = await supabase.from('orders').select('status').eq('id', current.order_id).maybeSingle()
    if (order?.status !== 'delivered') return NextResponse.json({ error: 'ESCROW_RELEASE_REQUIRES_DELIVERED_ORDER' }, { status: 409 })
  }
  const nextStatus = action === 'release' ? 'released' : 'refunded'
  const patch = action === 'release' ? { status: nextStatus, released_at: new Date().toISOString(), updated_at: new Date().toISOString() } : { status: nextStatus, refunded_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  const { data: updated, error } = await supabase.from('credi_escrow_cases').update(patch).eq('id', caseId).select('id,order_id,status,amount,currency').single()
  if (error || !updated) return NextResponse.json({ error: 'ESCROW_UPDATE_FAILED' }, { status: 500 })
  return NextResponse.json({ case: updated })
}
