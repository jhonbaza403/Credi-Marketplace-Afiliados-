import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data, error } = await supabase
    .from('business_rfqs')
    .select('id,title,description,category,quantity,target_unit_price,currency,delivery_country,needed_by,status,created_at,updated_at')
    .eq('buyer_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: 'No fue posible cargar las solicitudes B2B.' }, { status: 500 })
  return NextResponse.json({ rfqs: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const category = typeof body.category === 'string' ? body.category.trim() : null
  const quantity = Number(body.quantity)
  const targetUnitPrice = body.target_unit_price === null || body.target_unit_price === '' ? null : Number(body.target_unit_price)
  const currency = typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : 'USD'
  const deliveryCountry = typeof body.delivery_country === 'string' ? body.delivery_country.trim() : null
  const neededBy = typeof body.needed_by === 'string' && body.needed_by.trim() ? body.needed_by.trim() : null

  if (title.length < 3 || title.length > 300) return NextResponse.json({ error: 'El título debe tener entre 3 y 300 caracteres.' }, { status: 400 })
  if (description.length < 10 || description.length > 12000) return NextResponse.json({ error: 'La descripción debe tener entre 10 y 12.000 caracteres.' }, { status: 400 })
  if (!Number.isFinite(quantity) || quantity <= 0) return NextResponse.json({ error: 'La cantidad solicitada no es válida.' }, { status: 400 })
  if (targetUnitPrice !== null && (!Number.isFinite(targetUnitPrice) || targetUnitPrice < 0)) return NextResponse.json({ error: 'El precio objetivo no es válido.' }, { status: 400 })
  if (!/^[A-Z]{3}$/.test(currency)) return NextResponse.json({ error: 'La moneda no es válida.' }, { status: 400 })

  const { data: store } = await supabase.from('stores').select('id').eq('vendor_id', auth.user.id).maybeSingle()
  const { data, error } = await supabase.from('business_rfqs').insert({
    buyer_id: auth.user.id,
    store_id: store?.id ?? null,
    title,
    description,
    category,
    quantity,
    target_unit_price: targetUnitPrice,
    currency,
    delivery_country: deliveryCountry,
    needed_by: neededBy,
    status: 'open',
    visibility: 'network',
  }).select('id,title,description,category,quantity,target_unit_price,currency,delivery_country,needed_by,status,created_at').single()

  if (error || !data) return NextResponse.json({ error: 'No fue posible crear la solicitud de abastecimiento.' }, { status: 500 })
  return NextResponse.json({ rfq: data }, { status: 201 })
}
