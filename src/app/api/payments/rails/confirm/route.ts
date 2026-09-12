import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json({ error: 'UNAUTHORIZED' }, 401)

  const { data: actor } = await supabase.from('profiles').select('role,platform_owner').eq('id', user.id).maybeSingle()
  if (!actor || (actor.role !== 'admin' && actor.platform_owner !== true)) return json({ error: 'FORBIDDEN' }, 403)

  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return json({ error: 'INVALID_JSON' }, 400) }
  const paymentId = typeof body.payment_id === 'string' ? body.payment_id.trim() : ''
  const decision = body.decision === 'failed' ? 'failed' : 'succeeded'
  const reference = typeof body.reference === 'string' ? body.reference.trim().slice(0, 255) : null
  if (!paymentId) return json({ error: 'PAYMENT_ID_REQUIRED' }, 400)

  const db = createServiceClient()
  const { data: payment, error: paymentError } = await db.from('payment_orchestrations').select('id,order_id,user_id,amount,currency,method_type,status,provider_reference').eq('id', paymentId).maybeSingle()
  if (paymentError || !payment) return json({ error: 'PAYMENT_NOT_FOUND' }, 404)
  if (!['crypto', 'bank_transfer', 'manual'].includes(payment.method_type)) return json({ error: 'RAIL_NOT_CONFIRMABLE' }, 422)
  if (!['pending', 'requires_action'].includes(payment.status)) return json({ error: 'PAYMENT_NOT_PENDING' }, 409)

  const now = new Date().toISOString()
  const { error: updatePaymentError } = await db.from('payment_orchestrations').update({ status: decision, provider_reference: reference || payment.provider_reference, updated_at: now }).eq('id', payment.id).in('status', ['pending', 'requires_action'])
  if (updatePaymentError) return json({ error: 'PAYMENT_UPDATE_FAILED' }, 500)

  if (decision === 'failed') return json({ ok: true, payment_id: payment.id, status: 'failed' })

  if (!payment.order_id) return json({ error: 'ORDER_REQUIRED_FOR_SETTLEMENT' }, 422)
  const { data: order } = await db.from('orders').select('id,buyer_id,status,payment_status').eq('id', payment.order_id).maybeSingle()
  if (!order) return json({ error: 'ORDER_NOT_FOUND' }, 404)
  if (order.status === 'paid' || order.payment_status === 'paid') return json({ ok: true, payment_id: payment.id, status: 'succeeded', order_id: order.id })
  if (order.status !== 'pending' || order.payment_status !== 'pending') return json({ error: 'ORDER_NOT_PAYABLE' }, 409)

  const { error: orderError } = await db.from('orders').update({ status: 'paid', payment_status: 'paid', paid_at: now, updated_at: now }).eq('id', order.id).eq('status', 'pending').eq('payment_status', 'pending')
  if (orderError) return json({ error: 'ORDER_SETTLEMENT_FAILED' }, 500)
  await db.from('order_status_history').insert({ order_id: order.id, from_status: 'pending', to_status: 'paid', changed_by: user.id, reason: `${payment.method_type}_payment_confirmed`, metadata: { payment_id: payment.id, reference } })
  await db.from('commerce_events').insert({ user_id: order.buyer_id, event_type: 'order_paid', amount: Number(payment.amount), currency: String(payment.currency || 'USD').trim(), metadata: { provider: payment.method_type, payment_id: payment.id, reference } })
  return json({ ok: true, payment_id: payment.id, order_id: order.id, status: 'succeeded' })
}
