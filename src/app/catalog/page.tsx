'use client'

import { useEffect, useState } from 'react'

type Catalog = { id: string; name: string; description: string; audience: string; visibility: string; status: string }

export default function CatalogPage() {
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [name, setName] = useState('Mi catálogo Credi')
  const [audience, setAudience] = useState('both')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    const response = await fetch('/api/catalog', { cache: 'no-store' })
    if (response.status === 401) { window.location.assign(`/login?next=${encodeURIComponent('/catalog')}`); return }
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'No fue posible cargar los catálogos.')
    setCatalogs(data.catalogs || [])
  }
  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : 'No fue posible cargar los catálogos.')) }, [])

  async function createCatalog(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/catalog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, audience }) })
      const data = await response.json().catch(() => ({}))
      if (response.status === 401) { window.location.assign(`/login?next=${encodeURIComponent('/catalog')}`); return }
      if (!response.ok) throw new Error(data.error || 'No fue posible crear el catálogo.')
      setMessage('Catálogo creado correctamente.')
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible crear el catálogo.') }
    finally { setBusy(false) }
  }

  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><section className="rounded-[2rem] border border-border bg-card p-7 sm:p-10"><p className="text-xs font-black uppercase tracking-[.22em] text-primary">CREDI-CATALOG-AI</p><h1 className="mt-3 text-3xl font-black sm:text-5xl">Catálogo conectado</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">Gestiona catálogos comerciales sobre los productos existentes de Credi, sin crear una fuente paralela de inventario.</p><form onSubmit={createCatalog} className="mt-7 grid gap-3 sm:grid-cols-[1fr_180px_auto]"><input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={200} className="rounded-2xl border border-border bg-background px-4 py-3" /><select value={audience} onChange={(e) => setAudience(e.target.value)} className="rounded-2xl border border-border bg-background px-4 py-3"><option value="b2c">B2C</option><option value="b2b">B2B</option><option value="both">Ambos</option></select><button disabled={busy} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground disabled:opacity-50">{busy ? 'Creando…' : 'Crear catálogo'}</button></form>{message && <p role="status" className="mt-4 rounded-2xl border border-border bg-muted p-4 text-sm">{message}</p>}</section><section className="mt-6 grid gap-4 md:grid-cols-2">{catalogs.map((catalog) => <article key={catalog.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-black">{catalog.name}</h2><span className="text-xs font-bold uppercase text-primary">{catalog.status}</span></div><p className="mt-2 text-sm text-muted-foreground">{catalog.audience} · {catalog.visibility}</p><p className="mt-3 text-sm leading-6">{catalog.description || 'Sin descripción.'}</p></article>)}</section></div></main>
}
