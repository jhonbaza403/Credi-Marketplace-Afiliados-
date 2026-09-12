'use client'

import { useEffect, useState } from 'react'

type Plan = { id: string; order_id: string | null; service_level: string; destination_country: string | null; status: string; recommendation: Record<string, unknown> }

export default function CrediFlexPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [orderId, setOrderId] = useState('')
  const [serviceLevel, setServiceLevel] = useState('standard')
  const [country, setCountry] = useState('US')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    const response = await fetch('/api/credi-flex', { cache: 'no-store' })
    if (response.status === 401) { window.location.assign(`/login?next=${encodeURIComponent('/credi-flex')}`); return }
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'No fue posible cargar la planificación.')
    setPlans(data.plans || [])
  }
  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : 'No fue posible cargar la planificación.')) }, [])

  async function createPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/credi-flex', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id: orderId || null, service_level: serviceLevel, destination_country: country }) })
      const data = await response.json().catch(() => ({}))
      if (response.status === 401) { window.location.assign(`/login?next=${encodeURIComponent('/credi-flex')}`); return }
      if (!response.ok) throw new Error(data.error || 'No fue posible crear el plan.')
      setMessage('Plan logístico creado.')
      setOrderId('')
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible crear el plan.') }
    finally { setBusy(false) }
  }

  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><section className="rounded-[2rem] border border-border bg-card p-7 sm:p-10"><p className="text-xs font-black uppercase tracking-[.22em] text-primary">CREDI-FLEX-AI</p><h1 className="mt-3 text-3xl font-black sm:text-5xl">Planificación de fulfillment</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">Genera una recomendación operativa a partir de la orden y del nivel de servicio seleccionado. La ejecución con transportistas externos queda separada del motor Credi.</p><form onSubmit={createPlan} className="mt-7 grid gap-3 md:grid-cols-[1.4fr_180px_140px_auto]"><input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="ID de orden (opcional)" className="rounded-2xl border border-border bg-background px-4 py-3" /><select value={serviceLevel} onChange={(e) => setServiceLevel(e.target.value)} className="rounded-2xl border border-border bg-background px-4 py-3"><option value="standard">Estándar</option><option value="priority">Prioridad</option><option value="same_day">Mismo día</option></select><input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={2} required className="rounded-2xl border border-border bg-background px-4 py-3 uppercase" /><button disabled={busy} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground disabled:opacity-50">{busy ? 'Guardando…' : 'Crear plan'}</button></form>{message && <p role="status" className="mt-4 rounded-2xl border border-border bg-muted p-4 text-sm">{message}</p>}</section><section className="mt-6 grid gap-4 md:grid-cols-2">{plans.map((plan) => <article key={plan.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><h2 className="font-black">{plan.service_level}</h2><span className="text-xs font-black uppercase text-primary">{plan.status}</span></div><p className="mt-2 text-sm text-muted-foreground">Destino: {plan.destination_country || 'No indicado'}{plan.order_id ? ` · Orden ${plan.order_id}` : ''}</p><pre className="mt-3 overflow-auto rounded-xl bg-muted p-3 text-xs">{JSON.stringify(plan.recommendation, null, 2)}</pre></article>)}</section></div></main>
}
