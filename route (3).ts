import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, created_at')
    .eq('role', 'seller')
    .limit(50)

  if (error) {
    return NextResponse.json({ success: false, error: 'No fue posible obtener vendedores.' }, { status: 500 })
  }

  return NextResponse.json(
    { success: true, data: data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
  )
}
