import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const { id } = await context.params
  let body: { offer_id?: unknown }
  try { body = await request.json() as { offer_id?: unknown } } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const offerId = typeof body.offer_id === 'string' ? body.offer_id : ''
  if (!offerId) return NextResponse.json({ error: 'OFFER_REQUIRED' }, { status: 400 })
  const { data, error } = await supabase.rpc('accept_negotiation', { p_negotiation_id: id, p_offer_id: offerId })
  if (error) {
    const known = /FORBIDDEN|OFFER_NOT_FOUND|NEGOTIATION_NOT_OPEN/.exec(error.message)?.[0] ?? 'NEGOTIATION_ACCEPT_FAILED'
    return NextResponse.json({ error: known }, { status: known === 'FORBIDDEN' ? 403 : 409 })
  }
  return NextResponse.json({ ok: true, negotiation: data }, { headers: { 'Cache-Control': 'no-store' } })
}
