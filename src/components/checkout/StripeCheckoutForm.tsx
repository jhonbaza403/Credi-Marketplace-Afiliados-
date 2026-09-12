'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'

export default function StripeCheckoutForm() {
  const [orderId, setOrderId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const id = orderId.trim()
    if (!id) { setError('Introduce el identificador de una orden pendiente.'); return }
    setLoading(true)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ order_id: id, payment_method: 'stripe', region: 'GLOBAL' }),
      })
      const data = await response.json().catch(() => ({})) as { success?: boolean; error?: string; checkout?: { url?: string } }
      if (response.status === 401) { window.location.assign(`/login?redirectTo=${encodeURIComponent(`/pagos#stripe-checkout`)}`); return }
      if (!response.ok || !data.success) throw new Error(data.error || 'No fue posible iniciar Stripe Checkout.')
      if (!data.checkout?.url) throw new Error('Stripe no devolvió la URL de checkout.')
      window.location.assign(data.checkout.url)
    } catch (value) {
      setError(value instanceof Error ? value.message : 'No fue posible iniciar el pago.')
    } finally { setLoading(false) }
  }

  return <div className="rounded-3xl border border-border bg-background/80 p-6 shadow-xl">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-black uppercase tracking-[.16em] text-muted-foreground">Stripe Checkout</p><h2 className="mt-1 text-2xl font-black">Pagar una orden pendiente</h2></div>
      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-700 dark:text-emerald-300">Conectado</span>
    </div>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">Introduce una orden que ya exista. El servidor vuelve a verificar comprador, productos, total y moneda antes de crear la sesión de Stripe.</p>
    <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row">
      <label className="sr-only" htmlFor="stripe-order-id">Identificador de orden</label>
      <input id="stripe-order-id" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="UUID de la orden" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
      <button disabled={loading} type="submit" className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground shadow-lg disabled:opacity-50">{loading ? 'Conectando…' : 'Pagar con Stripe'}</button>
    </form>
    {error && <p role="alert" className="mt-3 rounded-xl border border-red-300/30 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
    <p className="mt-4 text-xs text-muted-foreground">Después del pago volverás a Credi Marketplace y podrás consultar el pedido desde <Link href="/orders" className="font-bold underline">Pedidos</Link>.</p>
  </div>
}
