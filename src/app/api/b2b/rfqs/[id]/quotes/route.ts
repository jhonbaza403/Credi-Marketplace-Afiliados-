import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } }) }

async function requireUser() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  return { supabase, user: auth.user }
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireUser()
  if (!user) return json({ error: 'UNAUTHORIZED' }, 401)
  const { id } = await context.params
  const admin = createAdminClient()
  const { data: rfq, error: rfqError } = await admin.from('business_rfqs').select('id,buyer_id,store_id,title,description,category,quantity,target_unit_price,currency,delivery_country,needed_by,status,visibility').eq('id', id).maybeSingle()
  if (rfqError || !rfq) return json({ error: 'RFQ_NOT_FOUND' }, 404)
  if (rfq.visibility !== 'network' && rfq.buyer_id !== user.id) return json({ error: 'FORBIDDEN' }, 403)

  const { data: quotes, error: quoteError } = await admin.from('business_rfq_quotes').select('id,rfq_id,supplier_id,store_id,unit_price,currency,min_order_quantity,lead_time_days,available_quantity,payment_terms,delivery_terms,notes,status,created_at,updated_at').eq('rfq_id', id).order('unit_price', { ascending: true }).limit(100)
  if (quoteError) return json({ error: 'QUOTES_UNAVAILABLE' }, 500)
  const visibleRfq = rfq.buyer_id === user.id ? rfq : { ...rfq, target_unit_price: null, buyer_id: undefined, store_id: undefined }
  const visibleQuotes = (quotes ?? []).filter((quote) => rfq.buyer_id === user.id || quote.supplier_id === user.id || quote.status === 'accepted').map((quote) => rfq.buyer_id === user.id ? quote : { ...quote, supplier_id: undefined, store_id: undefined })
  return json({ rfq: visibleRfq, quotes: visibleQuotes })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireUser()
  if (!user) return json({ error: 'UNAUTHORIZED' }, 401)
  const { id } = await context.params
  const { data: access, error: accessError } = await supabase.rpc('get_b2b_access_context', { p_user_id: user.id })
  if (accessError) return json({ error: 'B2B_ACCESS_UNAVAILABLE' }, 500)
  if (!access?.can_sell || access?.risk_blocked) return json({ error: 'VERIFICATION_REQUIRED', message: 'La cuenta debe estar habilitada para vender B2B.' }, 403)

  const admin = createAdminClient()
  const { data: rfq } = await admin.from('business_rfqs').select('id,buyer_id,status,visibility').eq('id', id).maybeSingle()
  if (!rfq || rfq.visibility !== 'network' || !['open', 'quoted'].includes(rfq.status) || rfq.buyer_id === user.id) return json({ error: 'RFQ_NOT_OPEN' }, 409)

  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return json({ error: 'INVALID_JSON' }, 400) }
  const unitPrice = Number(body.unit_price)
  const currency = typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : 'USD'
  const minOrderQuantity = body.min_order_quantity == null || body.min_order_quantity === '' ? null : Number(body.min_order_quantity)
  const leadTimeDays = body.lead_time_days == null || body.lead_time_days === '' ? null : Number(body.lead_time_days)
  const availableQuantity = body.available_quantity == null || body.available_quantity === '' ? null : Number(body.available_quantity)
  const paymentTerms = typeof body.payment_terms === 'string' ? body.payment_terms.trim().slice(0, 500) : null
  const deliveryTerms = typeof body.delivery_terms === 'string' ? body.delivery_terms.trim().slice(0, 500) : null
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : null

  if (!Number.isFinite(unitPrice) || unitPrice < 0) return json({ error: 'INVALID_UNIT_PRICE' }, 400)
  if (!/^[A-Z]{3}$/.test(currency)) return json({ error: 'INVALID_CURRENCY' }, 400)
  if (minOrderQuantity !== null && (!Number.isFinite(minOrderQuantity) || minOrderQuantity <= 0)) return json({ error: 'INVALID_MOQ' }, 400)
  if (leadTimeDays !== null && (!Number.isInteger(leadTimeDays) || leadTimeDays < 0)) return json({ error: 'INVALID_LEAD_TIME' }, 400)
  if (availableQuantity !== null && (!Number.isFinite(availableQuantity) || availableQuantity < 0)) return json({ error: 'INVALID_AVAILABLE_QUANTITY' }, 400)

  const { data: store } = await supabase.from('stores').select('id').eq('vendor_id', user.id).maybeSingle()
  const { data: quote, error } = await admin.from('business_rfq_quotes').upsert({ rfq_id: id, supplier_id: user.id, store_id: store?.id ?? null, unit_price: unitPrice, currency, min_order_quantity: minOrderQuantity, lead_time_days: leadTimeDays, available_quantity: availableQuantity, payment_terms: paymentTerms, delivery_terms: deliveryTerms, notes, status: 'submitted' }, { onConflict: 'rfq_id,supplier_id' }).select('id,rfq_id,unit_price,currency,min_order_quantity,lead_time_days,available_quantity,payment_terms,delivery_terms,notes,status,created_at,updated_at').single()
  if (error || !quote) return json({ error: 'QUOTE_CREATE_FAILED' }, 500)
  await admin.from('business_rfqs').update({ status: 'quoted' }).eq('id', id).in('status', ['open', 'quoted'])
  return json({ success: true, quote }, 201)
}
