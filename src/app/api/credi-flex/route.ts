import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function normalizeCountry(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const country = value.trim().toUpperCase()
  return /^[A-Z]{2}$/.test(country) ? country : null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const { data: plans, error } = await supabase.from('credi_flex_plans').select('id,order_id,service_level,destination_country,status,recommendation').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(50)
  if (error) return NextResponse.json({ error: 'FLEX_PLANS_UNAVAILABLE' }, { status: 500 })
  return NextResponse.json({ plans: plans ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const body = await request.json().catch(() => null) as { order_id?: unknown; service_level?: unknown; destination_country?: unknown } | null
  const serviceLevel = body?.service_level === 'priority' || body?.service_level === 'same_day' ? body.service_level : 'standard'
  const country = normalizeCountry(body?.destination_country)
  if (!country) return NextResponse.json({ error: 'INVALID_DESTINATION_COUNTRY' }, { status: 400 })
  const orderId = typeof body?.order_id === 'string' && body.order_id.trim() ? body.order_id.trim() : null
  let recommendation: Record<string, unknown> = { service_level: serviceLevel, destination_country: country, carrier_adapter: 'pending', decision_scope: 'fulfillment' }
  if (orderId) {
    const { data: order } = await supabase.from('orders').select('id,status,currency,total_amount').eq('id', orderId).eq('buyer_id', user.id).maybeSingle()
    if (!order) return NextResponse.json({ error: 'ORDER_NOT_FOUND' }, { status: 404 })
    const { data: items } = await supabase.from('order_items').select('product_id,quantity').eq('order_id', orderId)
    const productIds = (items ?? []).map((item) => item.product_id).filter(Boolean)
    let lowStockCount = 0
    if (productIds.length) {
      const { count } = await supabase.from('products').select('id', { count: 'exact', head: true }).in('id', productIds).lte('stock', 5)
      lowStockCount = count ?? 0
    }
    recommendation = { ...recommendation, order_status: order.status, order_total: Number(order.total_amount), low_stock_items: lowStockCount, inventory_signal: lowStockCount > 0 ? 'attention' : 'normal' }
  }
  const { data: plan, error } = await supabase.from('credi_flex_plans').insert({ owner_id: user.id, order_id: orderId, service_level: serviceLevel, destination_country: country, status: 'planned', recommendation, metadata: { module: 'CREDI-FLEX-AI' } }).select('id,order_id,service_level,destination_country,status,recommendation').single()
  if (error || !plan) return NextResponse.json({ error: 'FLEX_PLAN_CREATE_FAILED' }, { status: 500 })
  return NextResponse.json({ plan }, { status: 201 })
}
