'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BadgeCheck, Clock3, DollarSign, Send } from 'lucide-react'

type Rfq = { id: string; title: string; description: string; category: string | null; quantity: number; target_unit_price: number | null; currency: string; delivery_country: string | null; needed_by: string | null; status: string }
type Quote = { id: string; unit_price: number; currency: string; min_order_quantity: number | null; lead_time_days: number | null; available_quantity: number | null; payment_terms: string | null; delivery_terms: string | null; notes: string | null; status: string }

export default function RfqDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [rfq, setRfq] = useState<Rfq | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [unitPrice, setUnitPrice] = useState('')
  const [moq, setMoq] = useState('')
  const [lead, setLead] = useState('')
  const [available, setAvailable] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [deliveryTerms, setDeliveryTerms] = useState('')
  const [notes, setNotes] = useState('')
  const [rfqId, setRfqId] = useState('')

  async function load(id: string) {
    setLoading(true)
    try {
      const response = await fetch(`/api/b2b/rfqs/${encodeURIComponent(id)}/quotes`, { cache: 'no-store' })
      const data = await response.json() as { rfq?: Rfq; quotes?: Quote[]; error?: string }
      if (!response.ok) throw new Error(data.error || 'No fue posible cargar la RFQ.')
      setRfq(data.rfq ?? null); setQuotes(data.quotes ?? [])
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible cargar la RFQ.') } finally { setLoading(false) }
  }

  useEffect(() => { params.then(({ id }) => { setRfqId(id); void load(id) }) }, [params])

  async function submitQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (sending || !rfqId) return
    setSending(true); setMessage(null)
    try {
      const response = await fetch(`/api/b2b/rfqs/${encodeURIComponent(rfqId)}/quotes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ unit_price: Number(unitPrice), currency: rfq?.currency || 'USD', min_order_quantity: moq || null, lead_time_days: lead || null, available_quantity: available || null, payment_terms: paymentTerms, delivery_terms: deliveryTerms, notes }) })
      const data = await response.json() as { quote?: Quote; error?: string; message?: string }
      if (!response.ok) throw new Error(data.message || data.error || 'No fue posible enviar la cotización.')
      if (data.quote) setQuotes((current) => [...current.filter((item) => item.id !== data.quote?.id), data.quote!].sort((a, b) => a.unit_price - b.unit_price))
      setMessage('Cotización enviada y asociada a la solicitud.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible enviar la cotización.') } finally { setSending(false) }
  }

  if (loading) return <main className="min-h-screen bg-background p-6"><div className="mx-auto max-w-6xl rounded-3xl border border-border bg-card p-10"><p className="text-sm text-muted-foreground">Cargando operación B2B…</p></div></main>
  if (!rfq) return <main className="min-h-screen bg-background p-6"><div className="mx-auto max-w-6xl rounded-3xl border border-destructive/20 bg-card p-10"><p className="font-black">No se encontró la solicitud.</p><Link href="/abastecimiento" className="mt-4 inline-flex text-sm font-black text-primary">Volver a abastecimiento</Link></div></main>

  return <main className="min-h-screen bg-background text-foreground"><div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10"><Link href="/abastecimiento" className="inline-flex items-center gap-2 text-sm font-black text-primary"><ArrowLeft className="size-4"/> Abastecimiento</Link><section className="mt-5 rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-3xl"><span className="rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-primary">RFQ · {rfq.status}</span><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{rfq.title}</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">{rfq.description}</p></div><div className="grid grid-cols-2 gap-2 text-xs"><div className="rounded-2xl border border-border bg-muted/30 p-4"><span className="text-muted-foreground">Cantidad</span><b className="mt-1 block text-xl">{Number(rfq.quantity).toLocaleString('es-ES')}</b></div><div className="rounded-2xl border border-border bg-muted/30 p-4"><span className="text-muted-foreground">Precio objetivo</span><b className="mt-1 block text-xl">{rfq.target_unit_price == null ? '—' : `${Number(rfq.target_unit_price).toFixed(2)} ${rfq.currency}`}</b></div></div></div></section>

  <section className="mt-6 grid gap-6 lg:grid-cols-[.85fr_1.15fr]"><form onSubmit={submitQuote} className="rounded-3xl border border-border bg-card p-6 shadow-sm"><p className="text-[10px] font-black uppercase tracking-[.18em] text-primary">Proveedor</p><h2 className="mt-1 text-xl font-black">Enviar cotización</h2><div className="mt-5 space-y-4"><label className="block text-sm font-bold">Precio unitario<input required type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"/></label><div className="grid grid-cols-2 gap-3"><label className="text-sm font-bold">MOQ<input type="number" min="1" value={moq} onChange={(e) => setMoq(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"/></label><label className="text-sm font-bold">Entrega (días)<input type="number" min="0" value={lead} onChange={(e) => setLead(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"/></label></div><label className="block text-sm font-bold">Cantidad disponible<input type="number" min="0" value={available} onChange={(e) => setAvailable(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"/></label><label className="block text-sm font-bold">Condiciones de pago<input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} maxLength={500} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary" placeholder="Prepago, 50/50, NET 30…"/></label><label className="block text-sm font-bold">Condiciones de entrega<input value={deliveryTerms} onChange={(e) => setDeliveryTerms(e.target.value)} maxLength={500} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary" placeholder="EXW, FOB, entrega local…"/></label><label className="block text-sm font-bold">Notas<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={2000} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"/></label></div>{message ? <p className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">{message}</p> : null}<button type="submit" disabled={sending} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-black text-primary-foreground disabled:opacity-50">{sending ? 'Enviando…' : 'Enviar cotización'}<Send className="size-4"/></button></form>

  <section className="rounded-3xl border border-border bg-card p-6 shadow-sm"><div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-primary">Comparador</p><h2 className="mt-1 text-xl font-black">Cotizaciones recibidas</h2></div><span className="rounded-full bg-muted px-3 py-1 text-xs font-black">{quotes.length}</span></div><div className="mt-5 space-y-3">{quotes.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-10 text-center"><DollarSign className="mx-auto size-7 text-muted-foreground"/><p className="mt-3 font-black">Aún no hay cotizaciones</p><p className="mt-1 text-sm text-muted-foreground">Las propuestas aparecerán aquí para comparar precio, MOQ y entrega.</p></div> : quotes.map((quote, index) => <article key={quote.id} className="rounded-2xl border border-border bg-muted/20 p-5"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase text-emerald-700">{index === 0 ? 'Mejor precio' : quote.status}</span><BadgeCheck className="size-4 text-primary"/></div><p className="mt-2 text-2xl font-black">{Number(quote.unit_price).toFixed(2)} {quote.currency}</p></div><div className="text-right"><p className="text-xs text-muted-foreground">MOQ</p><p className="font-black">{quote.min_order_quantity ?? '—'}</p></div></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3"><div className="rounded-xl border border-border bg-background p-3"><Clock3 className="size-4 text-primary"/><p className="mt-2 text-[10px] text-muted-foreground">Entrega</p><b className="text-sm">{quote.lead_time_days == null ? '—' : `${quote.lead_time_days} días`}</b></div><div className="rounded-xl border border-border bg-background p-3"><p className="text-[10px] text-muted-foreground">Disponible</p><b className="text-sm">{quote.available_quantity ?? '—'}</b></div><div className="rounded-xl border border-border bg-background p-3 sm:col-span-1"><p className="text-[10px] text-muted-foreground">Pago</p><b className="line-clamp-2 text-sm">{quote.payment_terms || '—'}</b></div></div>{quote.notes ? <p className="mt-3 text-xs leading-5 text-muted-foreground">{quote.notes}</p> : null}</article>)}</div></section></section></div></main>
}
