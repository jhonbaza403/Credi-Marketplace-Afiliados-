'use client'

import { useEffect, useState } from 'react'

type Escrow = { id: string; order_id: string; amount: number; currency: string; status: string; release_condition: string; provider: string }

export default function EscrowPage() {
  const [cases, setCases] = useState<Escrow[]>([])
  const [orderId, setOrderId] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    const response = await fetch('/api/escrow', { cache: 'no-store' })
    if (response.status === 401) { window.location.assign(`/login?next=${encodeURIComponent('/escrow')}`); return }
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'No fue posible cargar las operaciones de custodia.')
    setCases(data.cases || [])
  }
  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : 'No fue posible cargar las operaciones.')) }, [])

  async function createCase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/escrow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id: orderId }) })
      const data = await response.json().catch(() => ({}))
      if (response.status === 401) { window.location.assign(`/login?next=${encodeURIComponent('/escrow')}`); return }
      if (!response.ok) throw new Error(data.error || 'No fue posible crear el expediente.')
      setMessage(data.message || 'Expediente Credi-Escrow creado.')
      setOrderId(''); await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible crear el expediente.') }
    finally { setBusy(false) }
  }

  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><section className="rounded-[2rem] border border-border bg-card p-7 sm:p-10"><p className="text-xs font-black uppercase tracking-[.22em] text-primary">CREDI-ESCROW</p><h1 className="mt-3 text-3xl font-black sm:text-5xl">Custodia y liberación controlada</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">Gestiona el expediente de custodia ligado a una orden. El estado financiero real se confirma exclusivamente por los eventos verificados del proveedor de pagos; este expediente no mueve fondos por sí mismo.</p><form onSubmit={createCase} className="mt-7 flex flex-col gap-3 sm:flex-row"><input value={orderId} onChange={(e) => setOrderId(e.target.value)} required placeholder="ID de orden pagada" className="min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 py-3" /><button disabled={busy} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground disabled:opacity-50">{busy ? 'Creando…' : 'Abrir expediente'}</button></form>{message && <p role="status" className="mt-4 rounded-2xl border border-border bg-muted p-4 text-sm">{message}</p>}</section><section className="mt-6 grid gap-4 md:grid-cols-2">{cases.map((item) => <article key={item.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-black">Orden {item.order_id}</h2><span className="text-xs font-black uppercase text-primary">{item.status}</span></div><p className="mt-2 text-sm text-muted-foreground">{item.currency} {Number(item.amount).toFixed(2)} · condición: {item.release_condition}</p><p className="mt-2 text-xs text-muted-foreground">Proveedor operativo: {item.provider}</p></article>)}</section></div></main>
}
