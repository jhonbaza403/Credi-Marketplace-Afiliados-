import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return json({ error: 'UNAUTHORIZED' }, 401)
  const { data, error } = await supabase.rpc('ensure_my_wallet')
  if (error) return json({ error: 'WALLET_UNAVAILABLE' }, 500)
  const { data: ledger } = await supabase.from('wallet_ledger').select('id,direction,amount,currency,entry_type,reference_type,reference_id,metadata,created_at').eq('wallet_id', data.id).order('created_at', { ascending: false }).limit(50)
  return json({ wallet: data, ledger: ledger ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return json({ error: 'UNAUTHORIZED' }, 401)
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return json({ error: 'INVALID_JSON' }, 400) }
  const recipient = typeof body.to_user_id === 'string' ? body.to_user_id : ''
  const amount = Number(body.amount)
  const currency = typeof body.currency === 'string' ? body.currency.toUpperCase() : 'USD'
  const key = typeof body.idempotency_key === 'string' ? body.idempotency_key.slice(0, 200) : crypto.randomUUID()
  if (!recipient || !Number.isFinite(amount) || amount <= 0) return json({ error: 'INVALID_TRANSFER' }, 400)
  if (!/^[A-Z]{3}$/.test(currency)) return json({ error: 'INVALID_CURRENCY' }, 400)
  const { data, error } = await supabase.rpc('wallet_transfer', { p_to_user_id: recipient, p_amount: amount, p_currency: currency, p_idempotency_key: key })
  if (error) {
    const code = /INSUFFICIENT_FUNDS|INVALID_RECIPIENT|WALLET_NOT_ACTIVE|CURRENCY_MISMATCH/.exec(error.message)?.[0] ?? 'WALLET_TRANSFER_FAILED'
    return json({ error: code }, code === 'INSUFFICIENT_FUNDS' ? 409 : 400)
  }
  return json({ ok: true, transfer: data }, 201)
}
