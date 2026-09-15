import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return json({ error: 'UNAUTHORIZED' }, 401)

  const { id: rfqId } = await context.params
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'INVALID_JSON' }, 400)
  }

  const quoteId = typeof body.quote_id === 'string' ? body.quote_id.trim() : ''
  const negotiationId = typeof body.negotiation_id === 'string' && body.negotiation_id.trim()
    ? body.negotiation_id.trim()
    : null

  if (!quoteId) return json({ error: 'QUOTE_REQUIRED' }, 400)

  const { data, error } = await supabase.rpc('create_b2b_award', {
    p_rfq_id: rfqId,
    p_quote_id: quoteId,
    p_buyer_id: auth.user.id,
    p_negotiation_id: negotiationId,
  })

  if (error || !data?.[0]) {
    const message = String(error?.message ?? '')
    const code = message.includes('RFQ_NOT_FOUND') ? 'RFQ_NOT_FOUND'
      : message.includes('BUYER_MISMATCH') ? 'FORBIDDEN'
      : message.includes('RFQ_NOT_OPEN') ? 'RFQ_NOT_OPEN'
      : message.includes('QUOTE_NOT_FOUND') ? 'QUOTE_NOT_FOUND'
      : message.includes('QUOTE_NOT_AWARDABLE') ? 'QUOTE_NOT_AWARDABLE'
      : message.includes('RFQ_ALREADY_AWARDED') ? 'RFQ_ALREADY_AWARDED'
      : 'B2B_AWARD_FAILED'
    const status = ['FORBIDDEN', 'RFQ_NOT_FOUND', 'QUOTE_NOT_FOUND'].includes(code) ? (code === 'FORBIDDEN' ? 403 : 404) : 409
    return json({ error: code }, status)
  }

  return json({ ok: true, award: data[0], next_step: 'order_or_negotiation' }, 201)
}
