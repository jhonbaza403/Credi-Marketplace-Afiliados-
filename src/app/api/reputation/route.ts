import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateReputation } from '@/lib/credi-autonomous'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('credi_reputation_profiles').select('*').eq('user_id', user.id).maybeSingle()
  if (error) return NextResponse.json({ error: 'Unable to load reputation' }, { status: 500 })
  return NextResponse.json({ reputation: data ?? { overall_score: 50, methodology_version: 'v1' } })
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json().catch(() => null) as { dimension?: string; event_type?: string; weight?: number } | null
    const dimension = typeof body?.dimension === 'string' ? body.dimension : 'buyer'
    if (!['buyer', 'seller', 'affiliate', 'supplier', 'courier'].includes(dimension)) return NextResponse.json({ error: 'Invalid dimension' }, { status: 400 })
    const weight = Number.isFinite(Number(body?.weight)) ? Math.max(-10, Math.min(10, Number(body?.weight))) : 0
    const { error: insertError } = await supabase.from('credi_reputation_events').insert({ user_id: user.id, dimension, event_type: body?.event_type?.slice(0, 100) ?? 'manual_event', weight })
    if (insertError) return NextResponse.json({ error: 'Unable to record reputation event' }, { status: 500 })

    const { data: events, error: readError } = await supabase.from('credi_reputation_events').select('weight').eq('user_id', user.id).eq('dimension', dimension).order('created_at', { ascending: false }).limit(100)
    if (readError) return NextResponse.json({ error: 'Unable to recalculate reputation' }, { status: 500 })
    const score = calculateReputation((events ?? []).map((event) => ({ weight: Number(event.weight) })))
    const key = `${dimension}_score`
    const { error: upsertError } = await supabase.from('credi_reputation_profiles').upsert({ user_id: user.id, [key]: score, overall_score: score, methodology_version: 'v1', updated_at: new Date().toISOString() })
    if (upsertError) return NextResponse.json({ error: 'Unable to persist reputation' }, { status: 500 })
    return NextResponse.json({ dimension, score, methodology: 'event-weighted baseline' })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
