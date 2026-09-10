'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, FileVideo, Loader2, Save, Video } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import MarketplaceMediaUploader from '@/components/media/MarketplaceMediaUploader'
import type { UploadedMarketplaceMedia } from '@/lib/storage/marketplace-media'

type Catalog = { id: string; name: string; description: string | null; status: string; visibility: string; video_media: unknown }

export default function CatalogVideoPublisher() {
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [catalogId, setCatalogId] = useState('')
  const [catalogName, setCatalogName] = useState('')
  const [description, setDescription] = useState('')
  const [media, setMedia] = useState<UploadedMarketplaceMedia[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void supabase.auth.getUser().then(async ({ data, error: authError }) => {
      if (authError) throw authError
      if (!active || !data.user) return
      setUserId(data.user.id)
      const { data: rows, error: catalogError } = await supabase.from('business_catalogs').select('id,name,description,status,visibility,video_media').eq('owner_id', data.user.id).order('created_at', { ascending: false })
      if (catalogError) throw catalogError
      if (!active) return
      setCatalogs((rows ?? []) as Catalog[])
      if (rows?.[0]) setCatalogId(rows[0].id)
    }).catch((e) => { if (active) setError(e instanceof Error ? e.message : 'No fue posible cargar los catálogos.') })
    return () => { active = false }
  }, [supabase])

  async function save() {
    if (!userId || saving || !media[0]) return
    setSaving(true); setMessage(null); setError(null)
    try {
      const video = media[0]
      if (catalogId) {
        const { error: updateError } = await supabase.from('business_catalogs').update({ video_media: [{ kind: video.kind, name: video.name, path: video.path, url: video.url, size: video.size, contentType: video.contentType }] }).eq('id', catalogId).eq('owner_id', userId)
        if (updateError) throw updateError
      } else {
        const name = catalogName.trim()
        if (name.length < 2) throw new Error('Indica el nombre del nuevo catálogo.')
        const { data, error: insertError } = await supabase.from('business_catalogs').insert({ owner_id: userId, name, description: description.trim() || null, audience: 'b2c', visibility: 'private', status: 'draft', video_media: [{ kind: video.kind, name: video.name, path: video.path, url: video.url, size: video.size, contentType: video.contentType }] }).select('id,name,description,status,visibility,video_media').single()
        if (insertError || !data) throw insertError ?? new Error('No fue posible crear el catálogo.')
        setCatalogs((current) => [data as Catalog, ...current]); setCatalogId(data.id as string); setCatalogName(''); setDescription('')
      }
      setMedia([])
      setMessage('Vídeo de catálogo guardado. El catálogo permanece privado hasta que lo publiques desde Gestión empresarial.')
    } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible guardar el vídeo del catálogo.') }
    finally { setSaving(false) }
  }

  return (
    <main className="min-h-screen bg-[#050816] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-3"><Link href="/chat" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-black text-slate-200 hover:bg-white/[.07]"><ArrowLeft size={15}/> Volver a Credi Chat</Link><Link href="/gestion-empresarial" className="rounded-xl bg-white/[.08] px-3 py-2 text-xs font-black text-slate-100">Gestión empresarial</Link></div>
        <header className="mt-5 rounded-[2rem] border border-cyan-300/10 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,.14),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(168,85,247,.14),transparent_32%),linear-gradient(135deg,#0b1024,#050816)] p-7 sm:p-10"><div className="flex items-center gap-4"><span className="flex size-14 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200"><FileVideo size={28}/></span><div><span className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Video Catalog Studio</span><h1 className="mt-2 text-3xl font-black sm:text-5xl">Catálogo en formato vídeo</h1></div></div><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">Crea una presentación vertical del catálogo para compartirla dentro de Credi Chat, Historias, Feed o los formatos de vídeo de Credi Marketplace.</p></header>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[.035] p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-bold text-slate-100">Catálogo existente<select value={catalogId} onChange={(event)=>setCatalogId(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"><option value="">Crear un catálogo nuevo</option>{catalogs.map((catalog)=><option key={catalog.id} value={catalog.id}>{catalog.name}</option>)}</select></label>{!catalogId&&<label className="text-sm font-bold text-slate-100">Nombre<input value={catalogName} onChange={(event)=>setCatalogName(event.target.value)} maxLength={160} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none" placeholder="Catálogo verano 2026"/></label>}</div>
          {!catalogId&&<label className="mt-5 block text-sm font-bold text-slate-100">Descripción<textarea value={description} onChange={(event)=>setDescription(event.target.value)} maxLength={1000} rows={3} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none" placeholder="Presentación comercial del catálogo…"/></label>}
          <div className="mt-7 border-t border-white/10 pt-7"><p className="mb-3 text-sm font-black">Vídeo del catálogo</p><MarketplaceMediaUploader kind="video" multiple={false} maxFiles={1} value={media} onChange={setMedia}/></div>
          <button type="button" onClick={()=>void save()} disabled={saving||!media[0]} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">{saving?<><Loader2 className="size-4 animate-spin"/> Guardando…</>:<><Save size={16}/> Guardar vídeo del catálogo</>}</button>
          {message&&<p role="status" className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-300/5 p-4 text-sm text-emerald-100"><CheckCircle2 className="mr-2 inline size-4"/>{message}</p>}
          {error&&<p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">{error}</p>}
        </section>
      </div>
    </main>
  )
}
