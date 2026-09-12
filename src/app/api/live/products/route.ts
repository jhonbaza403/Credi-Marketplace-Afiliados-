import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json().catch(() => null) as { session_id?: string; product_id?: string; featured?: boolean } | null
    if (!body?.session_id || !body?.product_id) return NextResponse.json({ error: 'session_id and product_id are required' }, { status: 400 })
    const { data: session } = await supabase.from('credi_live_sessions').select('id,host_user_id').eq('id', body.session_id).maybeSingle()
    if (!session || session.host_user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { data, error } = await supabase.from('credi_live_products').upsert({ session_id: body.session_id, product_id: body.product_id, featured: Boolean(body.featured) }, { onConflict: 'session_id,product_id' }).select('session_id,product_id,featured,sort_order').single()
    if (error) return NextResponse.json({ error: 'Unable to attach product' }, { status: 500 })
    return NextResponse.json({ product: data })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
