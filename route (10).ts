import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recommendProducts } from '@/services/recommendations/recommendation.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .limit(100)

  if (error) {
    return NextResponse.json({ success: false, error: 'No fue posible generar recomendaciones.' }, { status: 500 })
  }

  const ranked = recommendProducts(products ?? [], {})
  return NextResponse.json({ success: true, data: ranked.slice(0, 12) }, { headers: { 'Cache-Control': 'private, no-store' } })
}
