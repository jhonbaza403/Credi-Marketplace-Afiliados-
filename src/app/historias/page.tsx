'use client'

import { useCallback, useEffect, useState } from 'react'
import { ImagePlus, Loader2, Radio, Video } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import MarketplaceMediaUploader from '@/components/media/MarketplaceMediaUploader'
import type { UploadedMarketplaceMedia } from '@/lib/storage/marketplace-media'

export default function HistoriaVideoPublisher() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [media, setMedia] = useState<UploadedMarketplaceMedia[]>([])
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [supabase])

  const publish = useCallback(async () => {
    if (!userId || saving) return
    setSaving(true); setNotice(null); setError(null)
    try {
      if (!media.length && !body.trim()) throw new Error('Añade un vídeo, imagen o texto para crear la historia.')
      const payload = {
        owner_id: userId,
        body: body.trim() || null,
        media: media.map((item) => ({ kind: item.kind, name: item.name, path: item.path, url: item.url, size: item.size, contentType: item.contentType })),
        visibility: 'public',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        moderation_status: 'pending',
      }
      const { error: insertError } = await supabase.from('stories').insert(payload)
      if (insertError) throw insertError
      setBody(''); setMedia([]); setNotice('Historia enviada a moderación y programada para 24 horas.')
    } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible publicar la historia.') }
    finally { setSaving(false) }
  }, [body, media, saving, supabase, userId])

  if (!userId) {
    return <section className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-slate-950 p-8 text-center text-white"><Radio className="mx-auto size-10 text-cyan-200"/><h1 className="mt-4 text-2xl font-black">Carga de historias</h1><p className="mt-2 text-sm text-slate-400">Inicia sesión para subir historias, vídeos y productos.</p></section>
  }

  return (
    <main className="min-h-screen bg-[#050816] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-[2rem] border border-cyan-300/10 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,.14),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(168,85,247,.14),transparent_32%),linear-gradient(135deg,#0b1024,#050816)] p-7 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/15 bg-fuchsia-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-fuchsia-200"><Video size={12}/> Credi Stories</span><h1 className="mt-4 text-3xl font-black sm:text-5xl">Publica tu historia con vídeo</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">Se recuperó el flujo de carga multimedia. Puedes seleccionar un vídeo desde computadora, Android o iPhone; la publicación pasa por moderación antes de hacerse pública.</p></div><ImagePlus className="size-14 text-cyan-200/60"/></div>
        </header>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[.035] p-6 sm:p-8">
          <label className="block text-sm font-bold text-slate-100">Texto de la historia<textarea value={body} onChange={(event)=>setBody(event.target.value)} rows={4} maxLength={2000} placeholder="Describe el producto, promoción o novedad…" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"/></label>
          <div className="mt-7 border-t border-white/10 pt-7"><p className="mb-3 text-sm font-black">Multimedia</p><MarketplaceMediaUploader kind="video" multiple={false} maxFiles={1} value={media.filter((item)=>item.kind==='video')} onChange={setMedia}/></div>
          <div className="mt-5"><p className="mb-2 text-xs text-slate-500">También puedes abrir el selector desde el bloque de multimedia y reemplazar el vídeo antes de publicar.</p><button type="button" onClick={()=>void publish()} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">{saving?<><Loader2 className="size-4 animate-spin"/> Publicando…</>:<><Radio className="size-4"/> Publicar historia</>}</button></div>
          {notice&&<p role="status" className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-300/5 p-4 text-sm text-emerald-100">{notice}</p>}
          {error&&<p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">{error}</p>}
        </section>
      </div>
    </main>
  )
}
