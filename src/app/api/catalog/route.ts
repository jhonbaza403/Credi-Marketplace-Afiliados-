import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { isSameOrigin } from '@/lib/security/csrf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const catalogSchema = z.object({ name: z.string().trim().min(2).max(200), audience: z.enum(['b2b','both','b2c']).default('b2c') })

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const { data: catalogs, error } = await supabase.from('business_catalogs').select('id,name,description,audience,visibility,status').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(50)
  if (error) return NextResponse.json({ error: 'CATALOGS_UNAVAILABLE' }, { status: 500 })
  return NextResponse.json({ catalogs: catalogs ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'CSRF_VALIDATION_FAILED' }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
  if (!(request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) return NextResponse.json({ error: 'UNSUPPORTED_MEDIA_TYPE' }, { status: 415 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const raw = await request.json().catch(() => null)
  const parsed = catalogSchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_CATALOG_DATA' }, { status: 422, headers: { 'Cache-Control': 'no-store' } })
  const { name, audience } = parsed.data
  const { data: catalog, error } = await supabase.from('business_catalogs').insert({ owner_id: user.id, name, description: '', audience, visibility: 'private', status: 'draft' }).select('id,name,description,audience,visibility,status').single()
  if (error || !catalog) return NextResponse.json({ error: 'CATALOG_CREATE_FAILED' }, { status: 500 })
  return NextResponse.json({ catalog }, { status: 201 })
}
