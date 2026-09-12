import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('credi_live_sessions').select('id,title,status,started_at,ended_at,created_at').in('status', ['scheduled', 'live']).order('created_at', { ascending: false }).limit(50)
  if (error) return NextResponse.json({ error: 'Unable to load live sessions' }, { status: 500 })
  return NextResponse.json({ sessions: data ?? [] })
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json().catch(() => null) as { title?: string; product_ids?: string[] } | null
    const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 160) : ''
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })
    const { data: session, error } = await supabase.from('credi_live_sessions').insert({ host_user_id: user.id, title, status: 'scheduled' }).select('id,title,status,created_at').single()
    if (error || !session) return NextResponse.json({ error: 'Unable to create live session' }, { status: 500 })

    const productIds = Array.isArray(body?.product_ids) ? [...new Set(body.product_ids.filter((id): id is string => typeof id === 'string'))].slice(0, 50) : []
    if (productIds.length) {
      const { data: products } = await supabase.from('products').select('id').in('id', productIds)
      if (products?.length) {
        await supabase.from('credi_live_products').insert(products.map((p, index) => ({ session_id: session.id, product_id: p.id, sort_order: index })))
      }
    }
    return NextResponse.json({ session_id: session.id, status: session.status })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
