import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scoreCredit, hashInput, type CreditFeature } from '@/lib/credi-autonomous'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: orders } = await supabase.from('orders').select('id,status,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200)
    const total = orders?.length ?? 0
    const completed = (orders ?? []).filter((o) => ['completed', 'delivered'].includes(String(o.status))).length
    const recent = (orders ?? []).filter((o) => Date.now() - new Date(o.created_at).getTime() <= 90 * 86400000).length
    const features: CreditFeature[] = [
      { key: 'repayment_ratio', value: total ? completed / total : 0, source: 'credi.orders' },
      { key: 'completed_orders_90d', value: recent, source: 'credi.orders' },
      { key: 'account_recency_months', value: 1, source: 'credi.profile' },
      { key: 'identity_verified', value: 0, source: 'credi.profile' },
      { key: 'dispute_rate', value: 0, source: 'credi.orders' },
      { key: 'return_rate', value: 0, source: 'credi.orders' },
    ]
    const decision = scoreCredit(features)
    const inputHash = hashInput({ user_id: user.id, features })
    const { data: audit, error } = await supabase.from('credi_ai_decisions').insert({
      user_id: user.id,
      decision_type: 'credit',
      model_name: 'credi-activity-risk-v1',
      model_version: '1.0.0',
      input_hash: inputHash,
      decision: decision.decision,
      score: decision.score,
      reasons: decision.reasons,
      policy_version: 'credit-policy-v1',
    }).select('id').single()
    if (error) return NextResponse.json({ error: 'Unable to persist decision' }, { status: 500 })
    return NextResponse.json({ decision, decision_id: audit.id, features, methodology: 'activity-only baseline; not a production credit approval' })
  } catch {
    return NextResponse.json({ error: 'Unable to calculate credit decision' }, { status: 500 })
  }
}
