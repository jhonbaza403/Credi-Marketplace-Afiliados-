import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return json({ error: 'UNAUTHORIZED' }, 401)
  const { data, error } = await supabase.from('negotiations').select('id,rfq_id,listing_id,buyer_id,seller_id,state,currency,quantity,current_price,buyer_max_price,seller_min_price,rounds,auto_mode,metadata,created_at,updated_at').or(`buyer_id.eq.${auth.user.id},seller_id.eq.${auth.user.id}`).order('updated_at',{ascending:false}).limit(100)
  if (error) return json({ error: 'NEGOTIATIONS_UNAVAILABLE' }, 500)
  return json({ negotiations: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return json({ error: 'UNAUTHORIZED' }, 401)
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return json({ error: 'INVALID_JSON' }, 400) }
  const sellerId = typeof body.seller_id === 'string' ? body.seller_id : ''
  const currentPrice = Number(body.current_price)
  const quantity = Number(body.quantity ?? 1)
  const buyerMax = body.buyer_max_price == null || body.buyer_max_price === '' ? null : Number(body.buyer_max_price)
  const sellerMin = body.seller_min_price == null || body.seller_min_price === '' ? null : Number(body.seller_min_price)
  const currency = typeof body.currency === 'string' ? body.currency.toUpperCase() : 'USD'
  if (!sellerId || sellerId === auth.user.id) return json({ error: 'INVALID_SELLER' }, 400)
  if (!Number.isFinite(currentPrice) || currentPrice < 0 || !Number.isFinite(quantity) || quantity <= 0) return json({ error: 'INVALID_NEGOTIATION' }, 400)
  if ((buyerMax !== null && (!Number.isFinite(buyerMax) || buyerMax < currentPrice)) || (sellerMin !== null && (!Number.isFinite(sellerMin) || sellerMin > currentPrice))) return json({ error: 'INVALID_PRICE_BOUNDS' }, 400)
  if (!/^[A-Z]{3}$/.test(currency)) return json({ error: 'INVALID_CURRENCY' }, 400)
  const { data, error } = await supabase.from('negotiations').insert({ rfq_id: typeof body.rfq_id === 'string' ? body.rfq_id : null, listing_id: typeof body.listing_id === 'string' ? body.listing_id : null, buyer_id: auth.user.id, seller_id: sellerId, currency, quantity, current_price: currentPrice, buyer_max_price: buyerMax, seller_min_price: sellerMin, auto_mode: body.auto_mode === true, metadata: { source: 'credimarketplace' } }).select('id,rfq_id,listing_id,buyer_id,seller_id,state,currency,quantity,current_price,buyer_max_price,seller_min_price,rounds,auto_mode,created_at').single()
  if (error || !data) return json({ error: 'NEGOTIATION_CREATE_FAILED' }, 500)
  const { error: offerError } = await supabase.from('negotiation_offers').insert({ negotiation_id: data.id, actor_id: auth.user.id, actor_role: 'buyer', amount: currentPrice, currency, quantity, strategy: body.strategy ?? 'initial' })
  if (offerError) return json({ error: 'INITIAL_OFFER_FAILED' }, 500)
  return json({ ok: true, negotiation: data }, 201)
}
