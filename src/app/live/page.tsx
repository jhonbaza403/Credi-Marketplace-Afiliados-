'use client'

import { useEffect, useState } from 'react'

type Room = { id: string; title: string; status: string; viewer_count: number; started_at: string }

export default function LivePage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [title, setTitle] = useState('Nueva sesión Credi Live')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    const response = await fetch('/api/live', { cache: 'no-store' })
    if (response.status === 401) { window.location.assign(`/login?next=${encodeURIComponent('/live')}`); return }
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'No fue posible cargar las sesiones.')
    setRooms(data.rooms || [])
  }

  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : 'No fue posible cargar las sesiones.')) }, [])

  async function createRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/live', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
      const data = await response.json().catch(() => ({}))
      if (response.status === 401) { window.location.assign(`/login?next=${encodeURIComponent('/live')}`); return }
      if (!response.ok) throw new Error(data.error || 'No fue posible crear la sesión.')
      setMessage('Sesión creada correctamente.')
      setTitle('Nueva sesión Credi Live')
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible crear la sesión.') }
    finally { setBusy(false) }
  }

  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><section className="rounded-[2rem] border border-border bg-card p-7 sm:p-10"><p className="text-xs font-black uppercase tracking-[.22em] text-primary">CREDI-LIVE</p><h1 className="mt-3 text-3xl font-black sm:text-5xl">Comercio en vivo</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">Crea y administra salas en tiempo real usando el modelo Live de Credi Chat.</p><form onSubmit={createRoom} className="mt-7 flex flex-col gap-3 sm:flex-row"><input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} className="min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 py-3" /><button disabled={busy} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground disabled:opacity-50">{busy ? 'Creando…' : 'Crear sesión'}</button></form>{message && <p role="status" className="mt-4 rounded-2xl border border-border bg-muted p-4 text-sm">{message}</p>}</section><section className="mt-6 grid gap-4 md:grid-cols-2">{rooms.map((room) => <article key={room.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-black">{room.title}</h2><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">{room.status}</span></div><p className="mt-3 text-sm text-muted-foreground">{room.viewer_count} espectadores · {new Date(room.started_at).toLocaleString()}</p></article>)}</section></div></main>
}
