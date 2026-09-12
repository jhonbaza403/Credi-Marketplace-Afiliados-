import { NextResponse } from 'next/server'
import { scoreCredit, hashInput, type CreditFeature } from '@/lib/credi-autonomous'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null) as { features?: CreditFeature[] } | null
    const features = Array.isArray(body?.features) ? body.features.filter((f) => f && typeof f.key === 'string' && Number.isFinite(Number(f.value))) : []
    const decision = scoreCredit(features)
    const inputHash = hashInput({ user_id: user.id, features })

    const { data: audit, error: auditError } = await supabase
      .from('credi_ai_decisions')
      .insert({
        user_id: user.id,
        decision_type: 'credit',
        model_name: 'credi-deterministic-risk-v1',
        model_version: '1.0.0',
        input_hash: inputHash,
        decision: decision.decision,
        score: decision.score,
        reasons: decision.reasons,
        policy_version: 'credit-policy-v1',
      })
      .select('id')
      .single()

    if (auditError) return NextResponse.json({ error: 'Unable to record credit decision' }, { status: 500 })

    const { error: profileError } = await supabase.from('credi_credit_profiles').upsert({
      user_id: user.id,
      score: decision.score,
      risk_band: decision.riskBand,
      suggested_limit: decision.suggestedLimit,
      model_name: 'credi-deterministic-risk-v1',
      model_version: '1.0.0',
      last_decision_id: audit.id,
      status: decision.decision,
      updated_at: new Date().toISOString(),
    })

    if (profileError) return NextResponse.json({ error: 'Unable to persist credit profile' }, { status: 500 })

    return NextResponse.json({ ...decision, decision_id: audit.id, methodology: 'auditable heuristic baseline; not a guarantee of repayment' })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
