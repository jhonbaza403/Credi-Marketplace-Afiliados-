import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hashInput } from '@/lib/credi-autonomous'

function clean(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim().slice(0, 12000) : fallback
}

function buildContent(input: { title: string; description: string; locale?: string }) {
  const title = clean(input.title, 'Producto Credi').slice(0, 90)
  const description = clean(input.description, 'Producto seleccionado para el catálogo Credi.')
  const locale = clean(input.locale, 'es-VE')
  return {
    title: `${title} | Compra segura en Credi`.slice(0, 120),
    short_copy: `${description.slice(0, 180)}${description.length > 180 ? '…' : ''}`,
    description: `${description}\n\nCompra con protección de pago, seguimiento del pedido y soporte Credi.`,
    seo_keywords: [title.toLowerCase(), 'comprar online', 'Credi Marketplace', locale],
    faq: [
      { question: '¿Qué incluye?', answer: 'Consulta las especificaciones y condiciones indicadas por el vendedor.' },
      { question: '¿Cómo se entrega?', answer: 'La modalidad disponible depende del pedido y de la cobertura logística.' },
    ],
    b2b_pitch: `Solución ${title} con oferta comercial adaptable para compras empresariales.`,
    video_script: `0-3s: Presenta ${title}.\n3-8s: Destaca el beneficio principal.\n8-15s: Muestra el producto en uso.\n15-20s: Llamado a comprar en Credi.`,
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null) as { product_id?: string; title?: string; description?: string; locale?: string } | null
    const productId = clean(body?.product_id)
    if (!productId) return NextResponse.json({ error: 'product_id is required' }, { status: 400 })

    const { data: product, error: productError } = await supabase.from('products').select('id,name,description,store_id').eq('id', productId).maybeSingle()
    if (productError || !product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const { data: store } = await supabase.from('stores').select('id,user_id').eq('id', product.store_id).maybeSingle()
    if (!store || store.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const title = clean(body?.title, product.name ?? 'Producto Credi')
    const description = clean(body?.description, product.description ?? '')
    const output = buildContent({ title, description, locale: body?.locale })
    const inputHash = hashInput({ productId, title, description, locale: body?.locale ?? 'es-VE' })

    const { data: job, error: jobError } = await supabase.from('credi_content_jobs').insert({
      product_id: productId,
      user_id: user.id,
      provider: 'credi-template-ai',
      model: 'content-v1',
      input_hash: inputHash,
      status: 'completed',
      output,
      quality_score: 82,
      completed_at: new Date().toISOString(),
    }).select('id').single()
    if (jobError) return NextResponse.json({ error: 'Unable to persist content job' }, { status: 500 })

    return NextResponse.json({ job_id: job.id, content: output, quality_score: 82, generated: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
