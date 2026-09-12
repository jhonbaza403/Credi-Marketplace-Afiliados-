import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const { data: catalogs, error } = await supabase.from('business_catalogs').select('id,name,description,audience,visibility,status').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(50)
  if (error) return NextResponse.json({ error: 'CATALOGS_UNAVAILABLE' }, { status: 500 })
  return NextResponse.json({ catalogs: catalogs ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const body = await request.json().catch(() => null) as { name?: unknown; audience?: unknown } | null
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 200) : ''
  const audience = body?.audience === 'b2b' || body?.audience === 'both' ? body.audience : 'b2c'
  if (name.length < 2) return NextResponse.json({ error: 'INVALID_NAME' }, { status: 400 })
  const { data: catalog, error } = await supabase.from('business_catalogs').insert({ owner_id: user.id, name, description: '', audience, visibility: 'private', status: 'draft' }).select('id,name,description,audience,visibility,status').single()
  if (error || !catalog) return NextResponse.json({ error: 'CATALOG_CREATE_FAILED' }, { status: 500 })
  return NextResponse.json({ catalog }, { status: 201 })
}
