'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CheckoutPaymentPage() {
  const router = useRouter(); const searchParams = useSearchParams(); const orderId = searchParams.get('order_id')?.trim(); const cancelled = searchParams.get('payment_cancelled') === '1'
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); if (!orderId) { setError('No se encontró el identificador de la orden.'); return }
    setLoading(true)
    try {
      const supabase = createClient(); const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { router.push(`/login?redirectTo=${encodeURIComponent(`/checkout/payment?order_id=${orderId}`)}`); return }
      const response = await fetch('/api/checkout', { method:'POST', headers:{'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()}, body:JSON.stringify({order_id:orderId,payment_method:'stripe',region:'GLOBAL'}) })
      const data = await response.json().catch(() => ({})) as { success?:boolean; error?:string; checkout?:{url?:string;ready?:boolean}; order?:{amount?:number;currency?:string;status?:string} }
      if (!response.ok || !data.success) throw new Error(data.error || 'No fue posible preparar el pago.')
      if (!data.checkout?.url) throw new Error('Stripe no devolvió una URL de checkout válida.')
      window.location.assign(data.checkout.url)
    } catch (value) { setError(value instanceof Error ? value.message : 'No fue posible preparar el pago.') } finally { setLoading(false) }
  }
  if (!orderId) return <main className="min-h-screen px-4 py-16"><div className="mx-auto max-w-xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-2xl"><h1 className="text-2xl font-black">Orden no encontrada</h1><p className="mt-3 text-sm text-[var(--muted)]">Regresa al Marketplace para iniciar una nueva compra.</p><Link href="/marketplace" className="mt-6 inline-flex rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white">Volver al Marketplace</Link></div></main>
  return <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto max-w-4xl"><header className="rounded-3xl border border-cyan-300/15 bg-[linear-gradient(135deg,rgba(8,15,40,.97),rgba(7,21,36,.93))] p-7 text-white shadow-2xl sm:p-10"><span className="inline-flex rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-cyan-100">Paso 2 · Stripe</span><h1 className="mt-4 text-3xl font-black sm:text-4xl">Paga tu orden de forma segura</h1><p className="mt-2 text-sm leading-6 text-slate-300">Credi Marketplace valida la orden en el servidor y Stripe procesa los datos de pago. La confirmación definitiva llega mediante webhook verificado.</p></header>
    {cancelled && <p className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-800 dark:text-amber-200">El checkout de Stripe fue cancelado. La orden permanece pendiente.</p>}
    {error && <p role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-700 dark:text-red-200">{error}</p>}
    <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]"><section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl"><div className="rounded-2xl border border-indigo-300/20 bg-indigo-400/10 p-5"><p className="text-xs font-black uppercase tracking-widest">Stripe</p><h2 className="mt-2 text-xl font-black">Checkout hospedado</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Serás redirigido a Stripe para completar el pago. Nunca enviamos los datos de tu tarjeta a Credi Marketplace.</p></div><button type="submit" disabled={loading} className="mt-6 w-full rounded-2xl bg-[var(--primary)] px-5 py-4 text-sm font-black text-white shadow-lg disabled:opacity-50">{loading ? 'Abriendo Stripe…' : 'Continuar con Stripe'}</button></section><aside className="h-fit rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl"><p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Orden</p><code className="mt-3 block break-all rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3 text-xs">{orderId}</code><p className="mt-5 text-xs leading-5 text-[var(--muted)]">Una vez pagada, volverás a la pantalla de confirmación y el pedido quedará actualizado cuando Stripe entregue el webhook verificado.</p></aside></form>
  </div></main>
}
