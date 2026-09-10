'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const PAYMENT_OPTIONS = [
  { id: 'paypal', label: 'PayPal', note: 'Procesamiento electrónico mediante PayPal.' },
  { id: 'binance_pay', label: 'Binance Pay', note: 'Pago digital mediante Binance Pay.' },
  { id: 'usdt', label: 'USDT', note: 'Pago con USDT mediante el canal configurado.' },
  { id: 'bank_transfer', label: 'Transferencia bancaria', note: 'Instrucciones bancarias según la región.' },
] as const

type Provider = (typeof PAYMENT_OPTIONS)[number]['id']

type PrepareResponse = {
  success?: boolean
  checkout?: { ready?: boolean; provider?: string; region?: string; message?: string }
  order?: { id?: string; amount?: number; currency?: string; status?: string }
  error?: string
  message?: string
}

export default function CheckoutPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')?.trim()
  const [provider, setProvider] = useState<Provider>('paypal')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PrepareResponse | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setResult(null)

    if (!orderId) {
      setError('No se encontró el identificador de la orden.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        router.push(`/login?redirectTo=${encodeURIComponent(`/checkout/payment?order_id=${orderId}`)}`)
        return
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, payment_method: provider, region: 'GLOBAL' }),
      })

      const data = await response.json() as PrepareResponse
      if (!response.ok || !data.success) throw new Error(data.error || 'No fue posible preparar el pago.')
      setResult(data)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No fue posible preparar el pago.')
    } finally {
      setLoading(false)
    }
  }

  if (!orderId) {
    return (
      <main className="min-h-screen px-4 py-16">
        <div className="mx-auto max-w-xl rounded-3xl border border-[var(--border)] bg-[var(--surface)]/95 p-8 text-center shadow-2xl">
          <h1 className="text-2xl font-black">Orden no encontrada</h1>
          <p className="mt-3 text-sm text-[var(--muted)]">Regresa al Marketplace para iniciar una nueva compra.</p>
          <Link href="/marketplace" className="mt-6 inline-flex rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white">Volver al Marketplace</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="rounded-3xl border border-cyan-300/15 bg-[linear-gradient(135deg,rgba(8,15,40,.97),rgba(7,21,36,.93))] p-7 text-white shadow-2xl sm:p-10">
          <span className="inline-flex rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-cyan-100">Paso 2 · Pago</span>
          <h1 className="mt-4 text-3xl font-black sm:text-4xl">Selecciona cómo continuar</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">La orden ya está creada como pendiente. En este paso validamos el método; la confirmación definitiva siempre depende del proveedor y su webhook.</p>
        </header>

        {error && <p role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}

        <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)]/95 p-6 shadow-xl">
            <fieldset>
              <legend className="text-lg font-black">Método de pago</legend>
              <div className="mt-5 grid gap-3">
                {PAYMENT_OPTIONS.map((option) => (
                  <label key={option.id} className={`cursor-pointer rounded-2xl border p-4 transition ${provider === option.id ? 'border-[var(--primary)] bg-[var(--surface-secondary)] shadow-md' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
                    <input type="radio" name="provider" value={option.id} checked={provider === option.id} onChange={() => setProvider(option.id)} className="sr-only" />
                    <span className="flex items-center justify-between gap-4">
                      <span>
                        <strong className="block text-sm">{option.label}</strong>
                        <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{option.note}</span>
                      </span>
                      <span aria-hidden="true" className={`flex size-5 items-center justify-center rounded-full border ${provider === option.id ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border-strong)]'}`}>
                        {provider === option.id && <span className="size-2 rounded-full bg-white" />}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <button type="submit" disabled={loading} className="mt-6 w-full rounded-2xl bg-[var(--primary)] px-5 py-4 text-sm font-black text-white shadow-lg transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Validando…' : 'Validar método y continuar'}</button>
          </section>

          <aside className="h-fit rounded-3xl border border-[var(--border)] bg-[var(--surface)]/95 p-6 shadow-xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Orden</p>
            <code className="mt-3 block break-all rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3 text-xs">{orderId}</code>

            {result?.order && <div className="mt-5 space-y-2 text-sm"><div className="flex justify-between gap-3"><span className="text-[var(--muted)]">Importe</span><strong>{result.order.currency || 'USD'} {Number(result.order.amount || 0).toFixed(2)}</strong></div><div className="flex justify-between gap-3"><span className="text-[var(--muted)]">Estado</span><strong>{result.order.status || 'pending'}</strong></div></div>}

            {result && <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs leading-5 text-amber-700 dark:text-amber-200">{result.checkout?.message || result.message || 'Método validado. La siguiente integración corresponde al proveedor.'}</div>}
          </aside>
        </form>
      </div>
    </main>
  )
}
