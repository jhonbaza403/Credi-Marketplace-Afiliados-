'use client'

import { useEffect, useState } from 'react'

type RequestRow = { id: string; order_id: string | null; locker_code: string | null; pickup_country: string | null; pickup_city: string | null; pickup_address: string | null; status: string }

export default function LockerPage() {
  const [rows, setRows] = useState<RequestRow[]>([])
  const [orderId, setOrderId] = useState('')
  const [country, setCountry] = useState('US')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    const response = await fetch('/api/locker', { cache: 'no-store' })
    if (response.status === 401) { window.location.assign(`/login?next=${encodeURIComponent('/locker')}`); return }
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'No fue posible cargar los casilleros.')
    setRows(data.requests || [])
  }
  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : 'No fue posible cargar los casilleros.')) }, [])

  async function createRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/locker', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id: orderId || null, pickup_country: country, pickup_city: city, pickup_address: address }) })
      const data = await response.json().catch(() => ({}))
      if (response.status === 401) { window.location.assign(`/login?next=${encodeURIComponent('/locker')}`); return }
      if (!response.ok) throw new Error(data.error || 'No fue posible registrar la solicitud.')
      setMessage('Solicitud de Credi-Locker registrada.')
      setOrderId(''); setCity(''); setAddress(''); await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible registrar la solicitud.') }
    finally { setBusy(false) }
  }

  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><section className="rounded-[2rem] border border-border bg-card p-7 sm:p-10"><p className="text-xs font-black uppercase tracking-[.22em] text-primary">CREDI-LOCKER</p><h1 className="mt-3 text-3xl font-black sm:text-5xl">Puntos de entrega</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">Registra una solicitud de punto de entrega autorizada. La asignación física del casillero se mantiene como una capa operativa independiente.</p><form onSubmit={createRequest} className="mt-7 grid gap-3 md:grid-cols-2"><input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="ID de orden (opcional)" className="rounded-2xl border border-border bg-background px-4 py-3" /><input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={2} required placeholder="País" className="rounded-2xl border border-border bg-background px-4 py-3 uppercase" /><input value={city} onChange={(e) => setCity(e.target.value)} required placeholder="Ciudad" className="rounded-2xl border border-border bg-background px-4 py-3" /><input value={address} onChange={(e) => setAddress(e.target.value)} required placeholder="Dirección del punto" className="rounded-2xl border border-border bg-background px-4 py-3" /><button disabled={busy} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground md:col-span-2 disabled:opacity-50">{busy ? 'Registrando…' : 'Solicitar punto de entrega'}</button></form>{message && <p role="status" className="mt-4 rounded-2xl border border-border bg-muted p-4 text-sm">{message}</p>}</section><section className="mt-6 space-y-3">{rows.map((row) => <article key={row.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-black">{row.pickup_city}, {row.pickup_country}</h2><span className="text-xs font-black uppercase text-primary">{row.status}</span></div><p className="mt-2 text-sm text-muted-foreground">{row.pickup_address}{row.locker_code ? ` · Locker ${row.locker_code}` : ''}</p></article>)}</section></div></main>
}
