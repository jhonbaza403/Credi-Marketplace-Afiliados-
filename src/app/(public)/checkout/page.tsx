'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Product = {
  id: string
  title: string
  price: number
  stock: number
  is_active: boolean
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams.get('product_id')
  const affiliateRef = searchParams.get('ref')

  const [product, setProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadProduct() {
      if (!productId) {
        setError('No se especificó ningún producto para la compra.')
        setLoading(false)
        return
      }

      const supabase = createClient()
      const { data, error: queryError } = await supabase
        .from('products')
        .select('id, title, price, stock, is_active')
        .eq('id', productId)
        .eq('is_active', true)
        .maybeSingle()

      if (!active) return

      if (queryError || !data) {
        setError('El producto no existe, está inactivo o ya no está disponible.')
      } else {
        setProduct(data)
        if (data.stock <= 0) setError('Este producto se encuentra agotado.')
      }

      setLoading(false)
    }

    void loadProduct()
    return () => { active = false }
  }, [productId])

  const total = useMemo(
    () => product ? Number((product.price * quantity).toFixed(2)) : 0,
    [product, quantity],
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!product || product.stock <= 0 || quantity < 1 || quantity > product.stock) {
      setError('La cantidad solicitada no es válida.')
      return
    }

    setSubmitting(true)

    try {
      const supabase = createClient()
      const { data: auth } = await supabase.auth.getUser()

      if (!auth.user) {
        const currentUrl = `/checkout?product_id=${encodeURIComponent(product.id)}${affiliateRef ? `&ref=${encodeURIComponent(affiliateRef)}` : ''}`
        router.push(`/login?redirectTo=${encodeURIComponent(currentUrl)}`)
        return
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ product_id: product.id, quantity }],
          affiliate_ref: affiliateRef || null,
          region: 'GLOBAL',
        }),
      })

      const result = await response.json() as {
        success?: boolean
        orderId?: string
        error?: string
      }

      if (!response.ok || !result.orderId) {
        throw new Error(result.error || 'No fue posible crear la orden.')
      }

      router.push(`/checkout/payment?order_id=${encodeURIComponent(result.orderId)}`)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No fue posible procesar la orden.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <main className="min-h-screen px-4 py-16"><div className="mx-auto max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--surface)]/95 p-8 shadow-xl">Cargando checkout…</div></main>
  }

  if (!product) {
    return (
      <main className="min-h-screen px-4 py-16">
        <div className="mx-auto max-w-xl rounded-3xl border border-[var(--border)] bg-[var(--surface)]/95 p-8 text-center shadow-xl">
          <h1 className="text-2xl font-black">No se pudo preparar la compra</h1>
          <p className="mt-3 text-sm text-[var(--muted)]">{error}</p>
          <Link href="/marketplace" className="mt-6 inline-flex rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white">Volver al Marketplace</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href={`/products/${product.id}${affiliateRef ? `?ref=${encodeURIComponent(affiliateRef)}` : ''}`} className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]">← Volver al producto</Link>

        <header className="mt-6 rounded-3xl border border-cyan-300/15 bg-[linear-gradient(135deg,rgba(8,15,40,.96),rgba(7,21,36,.92))] p-7 text-white shadow-2xl sm:p-10">
          <span className="inline-flex rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-cyan-100">Checkout seguro</span>
          <h1 className="mt-4 text-3xl font-black sm:text-4xl">Finalizar compra</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">La orden se calcula y valida en el servidor. El pago se confirma únicamente mediante el proveedor y su webhook.</p>
        </header>

        {error && <p role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}

        <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)]/95 p-6 shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Producto seleccionado</p>
              <h2 className="mt-2 text-2xl font-black">{product.title}</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">Precio unitario: <strong className="text-[var(--foreground)]">${product.price.toFixed(2)}</strong></p>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)]/95 p-6 shadow-xl">
              <label htmlFor="quantity" className="text-sm font-black">Cantidad</label>
              <input id="quantity" type="number" min={1} max={product.stock} value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(Number(event.target.value) || 1, product.stock)))} className="mt-3 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)]" />
              <p className="mt-2 text-xs text-[var(--muted)]">Máximo disponible: {product.stock} unidades.</p>
            </div>

            {affiliateRef && <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/5 p-6"><p className="text-sm font-black">Referencia de afiliado aplicada</p><code className="mt-3 inline-block rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs">{affiliateRef}</code></div>}
          </section>

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)]/95 p-6 shadow-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Resumen</p>
              <div className="mt-5 flex items-end justify-between gap-4"><span className="text-sm text-[var(--muted)]">Total</span><span className="text-3xl font-black">${total.toFixed(2)}</span></div>
              <button type="submit" disabled={submitting || product.stock <= 0} className="mt-6 w-full rounded-2xl bg-[var(--primary)] px-5 py-4 text-sm font-black text-white shadow-lg transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50">{submitting ? 'Creando orden…' : 'Continuar al pago'}</button>
              <p className="mt-4 text-xs leading-5 text-[var(--muted)]">No se confirma ningún pago desde el navegador.</p>
            </div>
          </aside>
        </form>
      </div>
    </main>
  )
}
