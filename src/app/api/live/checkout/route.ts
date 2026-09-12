import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json().catch(() => null) as { session_id?: string; product_id?: string; quantity?: number } | null
    if (!body?.session_id || !body?.product_id) return NextResponse.json({ error: 'session_id and product_id are required' }, { status: 400 })
    const quantity = Math.max(1, Math.min(99, Math.floor(Number(body.quantity ?? 1))))
    const { data: session } = await supabase.from('credi_live_sessions').select('id,status').eq('id', body.session_id).maybeSingle()
    if (!session || session.status !== 'live') return NextResponse.json({ error: 'Live session is not active' }, { status: 409 })
    const { data: linked } = await supabase.from('credi_live_products').select('product_id').eq('session_id', body.session_id).eq('product_id', body.product_id).maybeSingle()
    if (!linked) return NextResponse.json({ error: 'Product is not part of this live session' }, { status: 404 })

    await supabase.from('credi_live_events').insert({ session_id: body.session_id, event_type: 'checkout_start', user_id: user.id, product_id: body.product_id, metadata: { quantity, one_tap: true } })
    return NextResponse.json({ handoff: true, checkout_path: `/checkout?product=${encodeURIComponent(body.product_id)}&quantity=${quantity}&live=${encodeURIComponent(body.session_id)}` })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
