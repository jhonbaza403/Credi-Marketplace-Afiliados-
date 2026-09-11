import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const [{ data: reputation }, { count: orders }, { count: ratings }] = await Promise.all([
    supabase.from('reputation_profiles').select('average_score,rating_count,reputation_level').eq('user_id', auth.user.id).maybeSingle(),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('buyer_id', auth.user.id),
    supabase.from('transaction_ratings').select('id', { count: 'exact', head: true }).eq('reviewer_id', auth.user.id),
  ])
  const reputationScore = Math.max(0, Math.min(100, Number(reputation?.average_score ?? 0) * 20))
  const volumeSignal = Math.min(20, Number(orders ?? 0) * 2)
  const ratingSignal = Math.min(10, Number(ratings ?? 0))
  const score = Math.round(Math.min(100, reputationScore * 0.7 + volumeSignal + ratingSignal))
  const level = score >= 75 ? 'low' : score >= 45 ? 'moderate' : score > 0 ? 'high' : 'unknown'
  const factors = { reputation_score: reputationScore, completed_order_signal: volumeSignal, rating_activity: ratingSignal }
  const { data, error } = await supabase.from('operational_risk_signals').upsert({ user_id: auth.user.id, score, level, factors, confidence: score === 0 ? 20 : 65, model_version: 'operational-v1', evaluated_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select('score,level,factors,confidence,model_version,evaluated_at').single()
  if (error) return NextResponse.json({ error: 'RISK_SIGNAL_FAILED' }, { status: 500 })
  return NextResponse.json({ advisory_only: true, notice: 'Señal operativa de confianza; no determina crédito, financiación ni elegibilidad financiera.', signal: data }, { headers: { 'Cache-Control': 'no-store' } })
}
