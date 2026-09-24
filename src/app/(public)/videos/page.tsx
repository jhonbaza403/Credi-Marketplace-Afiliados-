'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Heart, Loader2, MessageCircle, Play, Share2, Volume2, VolumeX } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Reel = { id:string; title:string; body:string; media:unknown; owner_id:string }
type Media = { url?:unknown; public_url?:unknown; kind?:unknown; contentType?:unknown }

function videoUrl(media: unknown) {
  if (!Array.isArray(media)) return null
  const item = media.find((entry) => {
    if (!entry || typeof entry !== 'object') return false
    const m = entry as Media
    return m.kind === 'video' || String(m.contentType ?? '').startsWith('video/')
  }) as Media | undefined
  const url = item?.url ?? item?.public_url
  return typeof url === 'string' && url ? url : null
}

export default function VideosFeedPage() {
  const supabase = useRef(createClient()).current
  const [videos,setVideos] = useState<Array<Reel & {videoUrl:string; creatorName:string}>>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState<string|null>(null)
  const [muted,setMuted] = useState(true)
  const [liked,setLiked] = useState<Set<string>>(() => new Set())
  const refs = useRef<Record<string,HTMLVideoElement|null>>({})

  useEffect(() => {
    let alive = true
    void (async () => {
      const {data,error:e} = await supabase.from('reels').select('id,title,body,media,owner_id').eq('status','published').eq('visibility','public').order('published_at',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false}).limit(100)
      if (!alive) return
      if (e) { setError(e.message); setLoading(false); return }
      const rows = (data ?? []) as Reel[]
      const ids = [...new Set(rows.map(r => r.owner_id))]
      const {data:people,error:pe} = ids.length ? await supabase.from('profiles').select('id,full_name').in('id',ids) : {data:[],error:null}
      if (!alive) return
      if (pe) { setError(pe.message); setLoading(false); return }
      const names = new Map((people ?? []).map(p => [p.id,p.full_name || 'Usuario Credi']))
      setVideos(rows.flatMap(row => { const url=videoUrl(row.media); return url ? [{...row,videoUrl:url,creatorName:names.get(row.owner_id) || 'Usuario Credi'}] : [] }))
      setLoading(false)
    })()
    return () => { alive=false }
  },[supabase])

  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      const video = entry.target as HTMLVideoElement
      if (entry.isIntersecting) void video.play().catch(() => undefined)
      else video.pause()
    }),{threshold:.75})
    Object.values(refs.current).forEach(v => { if(v) observer.observe(v) })
    return () => observer.disconnect()
  },[videos])

  function share(id:string,title:string) {
    const url = window.location.origin + '/videos/' + id
    void (navigator.share ? navigator.share({title,url}) : navigator.clipboard.writeText(url))
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-black text-white"><Loader2 className="size-5 animate-spin" /></main>
  if (error) return <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white"><div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-6 text-center"><h1 className="text-xl font-black">No fue posible cargar los videos</h1><p className="mt-2 text-sm">{error}</p></div></main>
  if (!videos.length) return <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white"><div className="text-center"><Play className="mx-auto size-12 text-white/30"/><h1 className="mt-4 text-2xl font-black">Todavía no hay videos publicados</h1><p className="mt-2 text-sm text-white/60">Los videos publicados aparecerán aquí automáticamente.</p><Link href="/catalogo-video" className="mt-5 inline-flex rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950">Publicar un video</Link></div></main>

  return <main className="min-h-screen bg-black text-white">
    <div className="sticky top-16 z-30 flex items-center justify-between border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur-xl"><div><h1 className="text-lg font-black">Videos</h1><p className="text-xs text-white/50">Productos y servicios</p></div><button type="button" onClick={()=>setMuted(v=>!v)} aria-label={muted?'Activar sonido':'Silenciar videos'} className="flex size-10 items-center justify-center rounded-full bg-white/10">{muted?<VolumeX className="size-5"/>:<Volume2 className="size-5"/>}</button></div>
    <div className="mx-auto w-full max-w-md snap-y snap-mandatory overflow-y-auto overscroll-contain">
      {videos.map(video => { const isLiked=liked.has(video.id); return <article key={video.id} className="relative h-[calc(100vh-4rem)] min-h-[600px] snap-start overflow-hidden bg-neutral-950">
        <video ref={node=>{refs.current[video.id]=node}} src={video.videoUrl} muted={muted} loop playsInline preload="metadata" className="absolute inset-0 size-full object-cover" aria-label={video.title}/>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"/>
        <div className="absolute inset-x-0 bottom-0 z-10 p-5 pb-8 pr-20"><p className="mb-2 text-sm font-bold">@{video.creatorName}</p><h2 className="text-xl font-black">{video.title || 'Video de Credi Marketplace'}</h2>{video.body&&<p className="mt-2 line-clamp-3 text-sm leading-5 text-white/75">{video.body}</p>}</div>
        <div className="absolute bottom-28 right-4 z-20 flex flex-col items-center gap-5">
          <button type="button" onClick={() => setLiked((current) => { const next = new Set(current); if (next.has(video.id)) next.delete(video.id); else next.add(video.id); return next })} aria-label={isLiked?'Quitar me gusta':'Me gusta'} className="flex flex-col items-center gap-1"><span className={'flex size-12 items-center justify-center rounded-full bg-black/45 backdrop-blur-md '+(isLiked?'text-red-500':'text-white')}><Heart className="size-6" fill={isLiked?'currentColor':'none'}/></span></button>
          <button type="button" aria-label="Comentarios" className="flex size-12 items-center justify-center rounded-full bg-black/45 backdrop-blur-md"><MessageCircle className="size-6"/></button>
          <button type="button" onClick={()=>share(video.id,video.title)} aria-label="Compartir video" className="flex flex-col items-center gap-1"><span className="flex size-12 items-center justify-center rounded-full bg-black/45 backdrop-blur-md"><Share2 className="size-6"/></span></button>
        </div>
      </article>})}
    </div>
  </main>
}
