import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return json({ error: 'UNAUTHORIZED' }, 401)
  const { id } = await context.params
  const { data: product, error } = await supabase.from('products').select('id,store_id,category_id,title,slug,description,price,stock,image_url,images,video_media,is_active,offering_type,created_at,updated_at').eq('id', id).maybeSingle()
  if (error || !product) return json({ error: 'PRODUCT_NOT_FOUND' }, 404)
  const { data: store } = await supabase.from('stores').select('id,vendor_id,store_name,slug,is_verified,is_active').eq('id', product.store_id).maybeSingle()
  if (!store || store.vendor_id !== auth.user.id) return json({ error: 'FORBIDDEN' }, 403)
  const [{ data: inventory }, { data: b2b }, { data: ratings }, { data: orders }, { data: conversations }, { data: publications }] = await Promise.all([
    supabase.from('inventory').select('product_id,available_quantity,reserved_quantity,updated_at').eq('product_id', id).maybeSingle(),
    supabase.from('b2b_products').select('id,title,wholesale_price_usd,regular_price_usd,min_order_quantity,stock_available,status,moderation_status,country').eq('product_id', id).maybeSingle(),
    supabase.from('transaction_ratings').select('id,score,comment,status,created_at').eq('product_id', id).eq('status','published').order('created_at',{ascending:false}).limit(50),
    supabase.from('order_items').select('order_id,quantity,unit_price,subtotal,created_at').eq('product_id', id).order('created_at',{ascending:false}).limit(100),
    supabase.from('conversations').select('id,title,created_at,updated_at').eq('product_id', id).order('updated_at',{ascending:false}).limit(50),
    supabase.from('feed_posts').select('id,title,status,published_at').eq('product_id', id).order('created_at',{ascending:false}).limit(50),
  ])
  const totals = (orders ?? []).reduce((acc, item) => ({ quantity: acc.quantity + Number(item.quantity || 0), revenue: acc.revenue + Number(item.subtotal || 0) }), { quantity: 0, revenue: 0 })
  return json({ version: '1.0', product, supplier: store, inventory: inventory ?? null, b2b_offer: b2b ?? null, reputation: { ratings_count: ratings?.length ?? 0, average_score: ratings?.length ? (ratings ?? []).reduce((s, r) => s + Number(r.score || 0), 0) / ratings!.length : null, ratings: ratings ?? [] }, commerce: { recent_order_items: orders ?? [], quantity_sold_observed: totals.quantity, revenue_observed: totals.revenue }, conversations: conversations ?? [], publications: publications ?? [], graph_links: ['supplier','category','inventory','b2b_offer','reputation','orders','conversations','publications','availability'] })
}
