import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { isSameOrigin } from '@/lib/security/csrf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeUrl(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || value.length > 500) return undefined
  try {
    const parsed = new URL(value)
    return ['https:', 'http:'].includes(parsed.protocol) ? parsed.toString() : undefined
  } catch { return undefined }
}

export async function GET() {
  const supabase = await createClient()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const { data, error } = await supabase.from('professional_profiles')
    .select('user_id,full_name,headline,summary,location,skills,experience,education,website_url,portfolio_url,visibility,updated_at')
    .eq('user_id', auth.user.id).maybeSingle()
  if (error) {
    console.error('[jobs:profile:read]', error)
    return NextResponse.json({ error: 'No fue posible cargar tu perfil profesional.' }, { status: 500 })
  }
  return NextResponse.json({ profile: data }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Origen no autorizado.' }, { status: 403 })
  const supabase = await createClient()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const limit = await distributedRateLimit(supabase, 'jobs:profile:' + auth.user.id, { limit: 10, windowMs: 60_000 })
  if (!limit.success) return NextResponse.json({ error: 'Demasiadas actualizaciones de perfil.' }, { status: 429 })

  let input: Record<string, unknown>
  try { input = await request.json() as Record<string, unknown> } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }
  if (typeof input.full_name === 'string' && input.full_name.length > 150) return NextResponse.json({ error: 'El nombre profesional supera el límite permitido.' }, { status: 400 })
  if (typeof input.headline === 'string' && input.headline.length > 180) return NextResponse.json({ error: 'El titular profesional supera el límite permitido.' }, { status: 400 })
  if (typeof input.summary === 'string' && input.summary.length > 5000) return NextResponse.json({ error: 'El resumen supera el límite permitido.' }, { status: 400 })
  if (typeof input.location === 'string' && input.location.length > 180) return NextResponse.json({ error: 'La ubicación supera el límite permitido.' }, { status: 400 })

  const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) || null : null
  const skills = Array.isArray(input.skills)
    ? input.skills.filter((v): v is string => typeof v === 'string').map(v => v.trim()).filter(Boolean).slice(0, 30).map(v => v.slice(0, 40))
    : []
  const websiteUrl = safeUrl(input.website_url)
  const portfolioUrl = safeUrl(input.portfolio_url)
  const visibility = input.visibility === 'public' ? 'public' : 'private'
  if (websiteUrl === undefined || portfolioUrl === undefined) {
    return NextResponse.json({ error: 'Los enlaces deben ser direcciones HTTP o HTTPS válidas.' }, { status: 400 })
  }

  const { data, error } = await supabase.from('professional_profiles').upsert({
    user_id: auth.user.id,
    full_name: text(input.full_name, 150),
    headline: text(input.headline, 180),
    summary: text(input.summary, 5000),
    location: text(input.location, 180),
    skills,
    website_url: websiteUrl,
    portfolio_url: portfolioUrl,
    visibility,
  }, { onConflict: 'user_id' })
    .select('user_id,full_name,headline,summary,location,skills,experience,education,website_url,portfolio_url,visibility,updated_at')
    .single()

  if (error || !data) {
    console.error('[jobs:profile:save]', error)
    return NextResponse.json({ error: 'No fue posible guardar tu perfil profesional.' }, { status: 500 })
  }
  return NextResponse.json({ profile: data }, { headers: { 'Cache-Control': 'no-store' } })
}
