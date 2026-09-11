'use client'

import { FormEvent, useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, ClipboardList, PackageSearch, Send } from 'lucide-react'

type Rfq = { id: string; title: string; description: string; category: string | null; quantity: number; target_unit_price: number | null; currency: string; delivery_country: string | null; needed_by: string | null; status: string; created_at: string }

type RfqResponse = { rfqs?: Rfq[]; rfq?: Rfq; error?: string }

export default function AbastecimientoPage() {
  const [rfqs, setRfqs] = useState<Rfq[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [quantity, setQuantity] = useState('100')
  const [targetUnitPrice, setTargetUnitPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [deliveryCountry, setDeliveryCountry] = useState('')
  const [neededBy, setNeededBy] = useState('')

  async function load() {
    setLoading(true)
    try {
      const response = await fetch('/api/b2b/rfqs', { cache: 'no-store' })
      const data = await response.json() as RfqResponse
      if (!response.ok) throw new Error(data.error || 'No fue posible cargar las solicitudes.')
      setRfqs(data.rfqs ?? [])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible cargar las solicitudes.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true); setMessage(null)
    try {
      const response = await fetch('/api/b2b/rfqs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description, category, quantity: Number(quantity), target_unit_price: targetUnitPrice ? Number(targetUnitPrice) : null, currency, delivery_country: deliveryCountry, needed_by: neededBy || null }) })
      const data = await response.json() as RfqResponse
      if (!response.ok) throw new Error(data.error || 'No fue posible crear la solicitud.')
      setMessage('Solicitud B2B creada. Ya está disponible en tu flujo de abastecimiento.')
      setTitle(''); setDescription(''); setCategory(''); setTargetUnitPrice(''); setNeededBy('')
      setRfqs((current) => data.rfq ? [data.rfq, ...current] : current)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible crear la solicitud.') } finally { setSaving(false) }
  }

  return <main className="min-h-screen bg-background text-foreground"><div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
    <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8"><div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-4xl"><div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-primary"><PackageSearch className="size-3.5"/> Credi Procurement</div><h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">Abastecimiento B2B</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">Convierte una necesidad de compra en una solicitud estructurada. El siguiente paso es comparar cotizaciones, condiciones, disponibilidad, entrega y reputación de proveedores.</p></div><div className="rounded-2xl border border-border bg-muted/30 p-4"><p className="text-[10px] font-black uppercase tracking-[.18em] text-muted-foreground">Solicitudes propias</p><p className="mt-1 text-3xl font-black">{rfqs.length}</p></div></div></section>

    <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]"><form onSubmit={submit} className="rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8"><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><ClipboardList className="size-5"/></span><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-primary">Nueva RFQ</p><h2 className="text-xl font-black">Describe lo que necesitas comprar</h2></div></div><div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="sm:col-span-2 text-sm font-bold">Necesidad comercial<input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={300} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3.5 outline-none focus:border-primary" placeholder="Ej. 500 cajas de alimentos enlatados"/></label><label className="sm:col-span-2 text-sm font-bold">Especificaciones<textarea value={description} onChange={(e) => setDescription(e.target.value)} required minLength={10} maxLength={12000} rows={7} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3.5 outline-none focus:border-primary" placeholder="Calidad, presentación, certificaciones, condiciones y cualquier requisito…"/></label><label className="text-sm font-bold">Categoría<input value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3.5 outline-none focus:border-primary" placeholder="Alimentos, tecnología…"/></label><label className="text-sm font-bold">Cantidad<input type="number" min="0.01" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3.5 outline-none focus:border-primary"/></label><label className="text-sm font-bold">Precio objetivo<input type="number" min="0" step="0.01" value={targetUnitPrice} onChange={(e) => setTargetUnitPrice(e.target.value)} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3.5 outline-none focus:border-primary" placeholder="Opcional"/></label><label className="text-sm font-bold">Moneda<select value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3.5 outline-none focus:border-primary"><option>USD</option><option>CAD</option><option>EUR</option><option>USDT</option></select></label><label className="text-sm font-bold">País de entrega<input value={deliveryCountry} onChange={(e) => setDeliveryCountry(e.target.value)} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3.5 outline-none focus:border-primary" placeholder="Canadá, Venezuela…"/></label><label className="text-sm font-bold">Fecha requerida<input type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3.5 outline-none focus:border-primary"/></label></div>{message ? <div role="status" className="mt-5 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary"/><span>{message}</span></div> : null}<button type="submit" disabled={saving} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-sm font-black text-primary-foreground disabled:opacity-50">{saving ? 'Creando solicitud…' : 'Crear solicitud B2B'}<Send className="size-4"/></button></form>

    <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8"><div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-primary">RFQ</p><h2 className="text-xl font-black">Historial de abastecimiento</h2></div>{loading ? <span className="text-xs text-muted-foreground">Cargando…</span> : null}</div><div className="mt-5 space-y-3">{rfqs.length === 0 && !loading ? <div className="rounded-2xl border border-dashed border-border p-8 text-center"><p className="font-black">Aún no tienes solicitudes</p><p className="mt-1 text-sm text-muted-foreground">Crea una y deja que el ecosistema B2B se convierta en tu pipeline de proveedores.</p></div> : rfqs.map((rfq) => <article key={rfq.id} className="rounded-2xl border border-border bg-muted/20 p-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="font-black">{rfq.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{rfq.description}</p></div><span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">{rfq.status}</span></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl border border-border bg-background p-3"><span className="text-muted-foreground">Cantidad</span><b className="mt-1 block">{Number(rfq.quantity).toLocaleString('es-ES')}</b></div><div className="rounded-xl border border-border bg-background p-3"><span className="text-muted-foreground">Objetivo</span><b className="mt-1 block">{rfq.target_unit_price == null ? 'Sin definir' : `${Number(rfq.target_unit_price).toFixed(2)} ${rfq.currency}`}</b></div></div><div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground"><span>{rfq.delivery_country || 'Entrega por definir'}</span><span>{rfq.needed_by || 'Sin fecha'}</span></div><button type="button" className="mt-4 inline-flex items-center gap-1 text-xs font-black text-primary">Preparar comparación <ArrowRight className="size-3.5"/></button></article>)}</div></section></section>
  </div></main>
}
