import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateCreateJobInput } from '@/lib/jobs/validation'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { isSameOrigin } from '@/lib/security/csrf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const fields = 'id,company,title,description,category,employment_type,work_mode,country,location,salary,salary_min,salary_max,salary_currency,status,created_at,updated_at'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const search = (url.searchParams.get('q') ?? '').trim().toLocaleLowerCase().slice(0, 100)
  const location = (url.searchParams.get('location') ?? '').trim().toLocaleLowerCase().slice(0, 100)
  const category = (url.searchParams.get('category') ?? '').trim().toLocaleLowerCase().slice(0, 80)
  const supabase = await createClient()
  const { data, error } = await supabase.from('jobs').select(fields)
    .eq('status', 'active').order('created_at', { ascending: false }).limit(100)

  if (error) {
    console.error('[jobs:list]', error)
    return NextResponse.json({ error: 'No fue posible cargar las vacantes.' }, { status: 500 })
  }

  const jobs = (data ?? []).filter(job => {
    const searchable = [job.title, job.company, job.description, job.category].filter(Boolean).join(' ').toLocaleLowerCase()
    const locationText = [job.location, job.country, job.work_mode].filter(Boolean).join(' ').toLocaleLowerCase()
    return (!search || searchable.includes(search))
      && (!location || locationText.includes(location))
      && (!category || String(job.category ?? '').toLocaleLowerCase().includes(category))
  })

  return NextResponse.json({ jobs }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Origen no autorizado.' }, { status: 403 })
  const supabase = await createClient()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Debes iniciar sesión para publicar una vacante.' }, { status: 401 })
  }
  const limit = await distributedRateLimit(supabase, 'jobs:create:' + auth.user.id, { limit: 5, windowMs: 60_000 })
  if (!limit.success) return NextResponse.json({ error: 'Has publicado demasiadas vacantes en poco tiempo.' }, { status: 429 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'El cuerpo de la solicitud no es JSON válido.' }, { status: 400 })
  }
  const validated = validateCreateJobInput(body)
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 })

  const { data, error } = await supabase.from('jobs').insert({
    ...validated.value, employer_id: auth.user.id, status: 'active',
  }).select(fields).single()

  if (error || !data) {
    console.error('[jobs:create]', error)
    return NextResponse.json({ error: 'No fue posible publicar la vacante.' }, { status: 500 })
  }
  return NextResponse.json({ job: data }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
}
