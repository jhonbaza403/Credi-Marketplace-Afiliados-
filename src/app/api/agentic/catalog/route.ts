import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = url.searchParams.get('q')?.trim().toLowerCase() || ''
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 50), 1), 100)
  const supabase = await createClient()
  let productQuery = supabase.from('published_products').select('id,store_id,category_id,title,slug,description,price,stock,image_url,images,is_active,created_at,updated_at').eq('is_active', true).gt('stock', 0).limit(limit)
  if (query) productQuery = productQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`)
  const { data: products, error } = await productQuery
  if (error) return NextResponse.json({ error: 'AGENTIC_CATALOG_UNAVAILABLE' }, { status: 500 })
  const { data: b2b } = await supabase.from('verified_b2b_products').select('id,product_id,supplier_id,title,category,wholesale_price_usd,regular_price_usd,min_order_quantity,stock_available,image_url,video_media,description,country,status').eq('status','active').eq('moderation_status','approved').gt('stock_available',0).limit(limit)
  return NextResponse.json({
    protocol: 'credi-agentic-catalog/v1',
    generated_at: new Date().toISOString(),
    capabilities: ['discover','compare','request_quote','start_checkout'],
    products: products ?? [],
    b2b_products: query ? (b2b ?? []).filter((p)=>`${p.title} ${p.description ?? ''}`.toLowerCase().includes(query)) : (b2b ?? []),
  }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300' } })
}
