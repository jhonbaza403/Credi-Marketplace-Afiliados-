import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function positiveInt(value: string | null, fallback: number, max: number) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const page = positiveInt(url.searchParams.get('page'), 1, 100000)
  const pageSize = positiveInt(url.searchParams.get('limit'), 24, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const supabase = await createClient()
  const { data, error, count } = await supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .range(from, to)

  if (error) {
    return NextResponse.json({ success: false, error: 'No fue posible obtener productos.' }, { status: 500 })
  }

  return NextResponse.json(
    { success: true, data: data ?? [], pagination: { page, pageSize, total: count ?? 0 } },
    { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
  )
}
