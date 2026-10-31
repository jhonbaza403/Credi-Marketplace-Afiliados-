import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ jobId: string }> }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params
  if (!UUID.test(jobId)) return NextResponse.json({ error: 'Vacante no válida.' }, { status: 400 })
  const supabase = await createClient()
  const { data, error } = await supabase.from('jobs')
    .select('id,company,title,description,category,employment_type,work_mode,country,location,salary,salary_min,salary_max,salary_currency,status,created_at,updated_at')
    .eq('id', jobId).maybeSingle()
  if (error) {
    console.error('[jobs:detail]', error)
    return NextResponse.json({ error: 'No fue posible consultar la vacante.' }, { status: 500 })
  }
  if (!data || data.status !== 'active') return NextResponse.json({ error: 'La vacante no está disponible.' }, { status: 404 })
  return NextResponse.json({ job: data }, { headers: { 'Cache-Control': 'no-store' } })
}
