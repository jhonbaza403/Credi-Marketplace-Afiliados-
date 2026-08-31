import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import B2BCheckoutModal from '@/components/checkout/B2BCheckoutModal'
import { createClient } from '@/lib/supabase/server'

interface B2BProduct {
  id: string
  title: string
  description: string | null
  moq: number
  unit_price_usdt: number
  stock_available: number
  category: string | null
  image_url: string | null
  supplier_id: string
  is_active?: boolean
}

interface B2BProductPageProps {
  params: Promise<{
    id: string
  }>
}

async function getB2BProduct(id: string): Promise<B2BProduct | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('b2b_products')
    .select(
      `
        id,
        title,
        description,
        moq,
        unit_price_usdt,
        stock_available,
        category,
        image_url,
        supplier_id,
        is_active
      `,
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Error al cargar producto B2B:', error)
    return null
  }

  if (!data) {
    return null
  }

  if (data.is_active === false) {
    return null
  }

  return data
}

export async function generateMetadata({
  params,
}: B2BProductPageProps): Promise<Metadata> {
  const { id } = await params
  const product = await getB2BProduct(id)

  if (!product) {
    return {
      title: 'Producto B2B no encontrado | Credi Marketplace',
      description: 'El producto mayorista solicitado no está disponible.',
    }
  }

  const description =
    product.description?.trim() ||
    `Compra mayorista de ${product.title} en Credi Marketplace.`

  return {
    title: `${product.title} | Mercado B2B`,
    description,
    openGraph: {
      title: `${product.title} | Credi Marketplace`,
      description,
      type: 'website',
      images: product.image_url
        ? [
            {
              url: product.image_url,
              alt: product.title,
            },
          ]
        : undefined,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function B2BProductDetailPage({
  params,
}: B2BProductPageProps) {
  const { id } = await params
  const product = await getB2BProduct(id)

  if (!product) {
    notFound()
  }

  const isAvailable =
    product.stock_available > 0 &&
    product.moq > 0 &&
    product.unit_price_usdt > 0

  const canPurchase =
    isAvailable && product.stock_available >= product.moq

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">

        <nav
          aria-label="Navegación B2B"
          className="mb-8"
        >
          <Link
            href="/b2b"
            className="inline-flex items-center gap-2 rounded-xl px-2 py-1 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <span aria-hidden="true">←</span>
            Volver al mercado mayorista
          </Link>
        </nav>

        <section
          aria-labelledby="b2b-product-title"
          className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2">

            {/* Imagen */}
            <div className="relative min-h-[360px] bg-muted sm:min-h-[480px] lg:min-h-[620px]">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              ) : (
                <div
                  className="flex h-full min-h-[360px] items-center justify-center"
                  aria-label="Imagen no disponible"
                >
                  <span
                    aria-hidden="true"
                    className="text-6xl opacity-40"
                  >
                    📦
                  </span>
                </div>
              )}

              <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5">
                <span className="rounded-full border border-amber-400/30 bg-amber-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-950 shadow-lg">
                  Mercado B2B
                </span>

                {!canPurchase && (
                  <span className="rounded-full border border-red-400/30 bg-red-500/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
                    No disponible
                  </span>
                )}
              </div>
            </div>

            {/* Información */}
            <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-12">

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-500">
                    {product.category || 'General'}
                  </span>

                  <span className="rounded-full border border-border bg-muted px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Compra empresarial
                  </span>
                </div>

                <h1
                  id="b2b-product-title"
                  className="mt-5 text-3xl font-black tracking-tight text-foreground sm:text-4xl"
                >
                  {product.title}
                </h1>

                <p className="mt-5 text-sm leading-7 text-muted-foreground">
                  {product.description?.trim() ||
                    'Este producto no dispone actualmente de una descripción detallada.'}
                </p>

                {/* Precio */}
                <div className="mt-8 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Precio mayorista
                  </span>

                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <span className="text-4xl font-black tracking-tight text-amber-500">
                      {product.unit_price_usdt.toFixed(2)}
                    </span>

                    <span className="mb-1 text-sm font-black text-amber-500">
                      USDT / unidad
                    </span>
                  </div>
                </div>

                {/* Datos comerciales */}
                <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">

                  <div className="rounded-2xl border border-border bg-background p-4">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Pedido mínimo
                    </dt>

                    <dd className="mt-1 text-lg font-black text-foreground">
                      {product.moq.toLocaleString('en-US')} unidades
                    </dd>
                  </div>

                  <div className="rounded-2xl border border-border bg-background p-4">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Inventario disponible
                    </dt>

                    <dd
                      className={`mt-1 text-lg font-black ${
                        product.stock_available >= product.moq
                          ? 'text-emerald-500'
                          : 'text-red-500'
                      }`}
                    >
                      {product.stock_available.toLocaleString('en-US')} unidades
                    </dd>
                  </div>

                </dl>

                {product.stock_available > 0 &&
                  product.stock_available < product.moq && (
                    <div
                      role="alert"
                      className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs leading-5 text-amber-500"
                    >
                      El inventario actual no alcanza el pedido mínimo de{' '}
                      <strong>{product.moq}</strong> unidades.
                    </div>
                  )}
              </div>

              {/* Acción */}
              <div className="mt-10 border-t border-border pt-6">

                {canPurchase ? (
                  <B2BCheckoutModal
                    productId={product.id}
                    productName={product.title}
                    wholesalePrice={product.unit_price_usdt}
                    minQuantity={product.moq}
                    maxQuantity={product.stock_available}
                    supplierId={product.supplier_id}
                  />
                ) : (
                  <div className="rounded-2xl border border-border bg-muted/40 p-5 text-center">
                    <p className="text-sm font-bold text-foreground">
                      Este lote no está disponible para compra.
                    </p>

                    <Link
                      href="/b2b"
                      className="mt-4 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground transition hover:opacity-90"
                    >
                      Explorar otros productos
                    </Link>
                  </div>
                )}

                <div className="mt-5 flex gap-3">
                  <span
                    aria-hidden="true"
                    className="text-emerald-500"
                  >
                    ✓
                  </span>

                  <p className="text-[11px] leading-5 text-muted-foreground">
                    Las cantidades, precios, disponibilidad y condiciones
                    definitivas deben validarse en el servidor antes de
                    confirmar cualquier operación.
                  </p>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* Información de confianza */}
        <section
          aria-label="Información de seguridad"
          className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          <div className="rounded-2xl border border-border bg-card p-5">
            <span
              aria-hidden="true"
              className="text-xl"
            >
              🔒
            </span>

            <h2 className="mt-3 text-sm font-black text-foreground">
              Operación segura
            </h2>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Las operaciones deben ser validadas antes de confirmarse.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <span
              aria-hidden="true"
              className="text-xl"
            >
              📦
            </span>

            <h2 className="mt-3 text-sm font-black text-foreground">
              Compra mayorista
            </h2>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Consulta el MOQ y el inventario disponible antes de realizar
              tu pedido.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <span
              aria-hidden="true"
              className="text-xl"
            >
              ⚡
            </span>

            <h2 className="mt-3 text-sm font-black text-foreground">
              Proceso optimizado
            </h2>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              El flujo está preparado para integrarse con una pasarela de
              pago controlada por servidor.
            </p>
          </div>
        </section>

      </div>
    </main>
  )
}
