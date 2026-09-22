'use client'

import { FormEvent, useMemo, useState } from 'react'

const rails = [
  ['stripe', 'Stripe'], ['crypto', 'Crypto'], ['bank_transfer', 'Bank transfer'], ['wallet', 'Wallet'], ['manual', 'Manual'],
] as const

type RailKey = (typeof rails)[number][0]
type Result = { ok?: boolean; error?: string; next_action?: string; checkout?: { id?: string; url?: string; status?: string; network?: string; address?: string; expires_at?: string }; rail?: Record<string, unknown>; payment?: { provider_reference?: string; status?: string; amount?: number; currency?: string } }

export default function PaymentRailPanel() {
  const [method, setMethod] = useState<RailKey>('stripe')
  const [orderId, setOrderId] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const label = useMemo(() => rails.find(([key]) => key === method)?.[1] || method, [method])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setResult(null)
    const id = orderId.trim()
    try {
      if (!id) throw new Error('Introduce el UUID de una orden pendiente.')
      const key = crypto.randomUUID()
      const endpoint = method === 'stripe' ? '/api/checkout' : '/api/payments/rails'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify({ order_id: id, payment_method: method, method_type: method, region: 'GLOBAL', idempotency_key: key }),
      })
      const data = await response.json().catch(() => ({})) as Result
      if (response.status === 401) {
        window.location.assign(`/login?redirectTo=${encodeURIComponent('/pagos')}`)
        return
      }
      if (!response.ok || !data.ok) throw new Error(data.error || `No fue posible iniciar ${label}.`)
      setResult(data)
      if (data.checkout?.url && ['stripe', 'crypto'].includes(method)) window.location.assign(data.checkout.url)
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'No fue posible iniciar el pago.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-border bg-background/80 p-6 shadow-xl" aria-labelledby="payment-rails-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[.16em] text-muted-foreground">CREDI Payment Rails</p>
          <h2 id="payment-rails-title" className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">Selecciona el método de pago</h2>
        </div>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-700 dark:text-emerald-300">5 rails activos</span>
      </div>

      <div className="mt-5" role="tablist" aria-label="Métodos de pago">
        <div className="grid gap-2 sm:grid-cols-5">
          {rails.map(([key, name]) => {
            const selected = method === key
            const description =
              key === 'stripe' ? 'Checkout automático' :
              key === 'wallet' ? 'Liquidación interna' :
              key === 'crypto' ? 'Coinbase Business · USDC/Base' :
              key === 'bank_transfer' ? 'Verificación bancaria' :
              'Confirmación administrativa'
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => { setMethod(key); setResult(null) }}
                className={`rounded-xl border p-3 text-left text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${selected ? 'border-primary bg-primary/10' : 'border-border bg-muted/20 hover:bg-muted/40'}`}
              >
                <span>{name}</span>
                <span className="mt-1 block text-[11px] font-medium text-muted-foreground">{description}</span>
              </button>
            )
          })}
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="rail-order-id">Identificador de orden</label>
        <input
          id="rail-order-id"
          value={orderId}
          onChange={e => setOrderId(e.target.value)}
          placeholder="UUID de la orden pendiente"
          className="min-w-0 flex-1 rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary/30 dark:bg-slate-800 dark:text-slate-100"
        />
        <button disabled={loading} className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground disabled:opacity-50">
          {loading ? 'Procesando…' : `Pagar con ${label}`}
        </button>
      </form>

      {method === 'crypto' && <p className="mt-3 text-xs text-muted-foreground">El checkout se crea en Coinbase Business con USDC sobre Base. La orden se considera pagada únicamente después del webhook de confirmación.</p>}
      {result?.error && <p role="alert" className="mt-4 rounded-xl border border-red-300/30 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{result.error}</p>}
      {result?.payment && <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4 text-sm"><p className="font-black">Estado: {result.payment.status}</p><p className="mt-1 text-muted-foreground">Referencia: {result.payment.provider_reference || '—'}</p></div>}
      {result?.rail && <div className="mt-4 rounded-2xl border border-border bg-muted/20 p-4 text-sm"><p className="font-black">Instrucciones de {label}</p><pre className="mt-2 whitespace-pre-wrap break-words font-sans text-muted-foreground">{Object.entries(result.rail).map(([k, v]) => `${k}: ${String(v ?? '—')}`).join('\n')}</pre></div>}
    </section>
  )
}
