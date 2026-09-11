import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return json({ error: 'UNAUTHORIZED' }, 401)
  const { id } = await context.params
  const { data: negotiation, error } = await supabase.from('negotiations').select('*').eq('id', id).maybeSingle()
  if (error || !negotiation) return json({ error: 'NEGOTIATION_NOT_FOUND' }, 404)
  if (negotiation.buyer_id !== auth.user.id && negotiation.seller_id !== auth.user.id) return json({ error: 'FORBIDDEN' }, 403)
  const { data: offers } = await supabase.from('negotiation_offers').select('id,actor_id,actor_role,amount,currency,quantity,terms,strategy,status,created_at').eq('negotiation_id', id).order('created_at',{ascending:true})
  return json({ negotiation, offers: offers ?? [] })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return json({ error: 'UNAUTHORIZED' }, 401)
  const { id } = await context.params
  const { data: negotiation } = await supabase.from('negotiations').select('id,buyer_id,seller_id,state,currency,quantity,current_price,buyer_max_price,seller_min_price,rounds,auto_mode').eq('id', id).maybeSingle()
  if (!negotiation) return json({ error: 'NEGOTIATION_NOT_FOUND' }, 404)
  if (negotiation.buyer_id !== auth.user.id && negotiation.seller_id !== auth.user.id) return json({ error: 'FORBIDDEN' }, 403)
  if (negotiation.state !== 'open') return json({ error: 'NEGOTIATION_CLOSED' }, 409)
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return json({ error: 'INVALID_JSON' }, 400) }
  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount < 0) return json({ error: 'INVALID_AMOUNT' }, 400)
  const isBuyer = negotiation.buyer_id === auth.user.id
  if (isBuyer && negotiation.buyer_max_price !== null && amount > Number(negotiation.buyer_max_price)) return json({ error: 'BUYER_LIMIT_EXCEEDED' }, 409)
  if (!isBuyer && negotiation.seller_min_price !== null && amount < Number(negotiation.seller_min_price)) return json({ error: 'SELLER_LIMIT_EXCEEDED' }, 409)
  const rounds = Number(negotiation.rounds) + 1
  if (rounds > 20) return json({ error: 'ROUND_LIMIT_REACHED' }, 409)
  const role = isBuyer ? 'buyer' : 'seller'
  const { data: offer, error: offerError } = await supabase.from('negotiation_offers').insert({ negotiation_id: id, actor_id: auth.user.id, actor_role: role, amount, currency: negotiation.currency, quantity: Number(body.quantity ?? negotiation.quantity), terms: typeof body.terms === 'string' ? body.terms.slice(0,1000) : null, strategy: typeof body.strategy === 'string' ? body.strategy.slice(0,100) : 'counter' }).select('id,actor_id,actor_role,amount,currency,quantity,terms,strategy,status,created_at').single()
  if (offerError || !offer) return json({ error: 'OFFER_CREATE_FAILED' }, 500)
  const { error: updateError } = await supabase.from('negotiations').update({ current_price: amount, rounds, updated_at: new Date().toISOString() }).eq('id', id).eq('state','open')
  if (updateError) return json({ error: 'NEGOTIATION_UPDATE_FAILED' }, 500)
  return json({ ok: true, offer, rounds }, 201)
}
