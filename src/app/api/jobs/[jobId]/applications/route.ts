import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateJobApplicationInput } from '@/lib/jobs/validation'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { isSameOrigin } from '@/lib/security/csrf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ jobId: string }> }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request, context: RouteContext) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Origen no autorizado.' }, { status: 403 })
  const { jobId } = await context.params
  if (!UUID.test(jobId)) return NextResponse.json({ error: 'Vacante no válida.' }, { status: 400 })
  const supabase = await createClient()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) return NextResponse.json({ error: 'Inicia sesión para postularte.' }, { status: 401 })
  const limit = await distributedRateLimit(supabase, 'jobs:apply:' + auth.user.id, { limit: 10, windowMs: 60_000 })
  if (!limit.success) return NextResponse.json({ error: 'Demasiados intentos de postulación.' }, { status: 429 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Los datos de postulación no son válidos.' }, { status: 400 })
  }
  const validated = validateJobApplicationInput(body)
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 })

  const { data: job, error: jobError } = await supabase.from('jobs')
    .select('id,employer_id,status').eq('id', jobId).maybeSingle()
  if (jobError) {
    console.error('[jobs:apply:lookup]', jobError)
    return NextResponse.json({ error: 'No fue posible validar la vacante.' }, { status: 500 })
  }
  if (!job || job.status !== 'active') return NextResponse.json({ error: 'La vacante no está disponible.' }, { status: 404 })
  if (job.employer_id === auth.user.id) return NextResponse.json({ error: 'No puedes postularte a una vacante de tu propia cuenta.' }, { status: 403 })

  const { data, error } = await supabase.from('job_applications').insert({
    job_id: jobId, candidate_id: auth.user.id,
    cover_letter: validated.value.cover_letter, status: 'pending',
  }).select('id,job_id,candidate_id,status,created_at').single()

  if (error?.code === '23505') return NextResponse.json({ error: 'Ya existe una postulación de tu cuenta para esta vacante.' }, { status: 409 })
  if (error || !data) {
    console.error('[jobs:apply:create]', error)
    return NextResponse.json({ error: 'No fue posible registrar tu postulación.' }, { status: 500 })
  }
  return NextResponse.json({ application: data }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
}
