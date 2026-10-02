'use client'

import { useEffect, useRef, useState } from 'react'
import { BarChart3, CalendarClock, Camera, CircleStop, Copy, Eye, Heart, KeyRound, MessageCircle, Package, Play, Radio, ShieldCheck, Sparkles, Users, Video } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CrediLiveChat } from '@/components/live/CrediLiveChat'

type Room={id:string;host_user_id:string;title:string;status:string;viewer_count:number;started_at:string|null;ended_at?:string|null;description:string;cover_media:unknown;scheduled_at:string|null;replay_url:string|null;playback_url:string|null;stream_provider:string;viewer_peak:number;likes_count:number;shares_count:number;settings:Record<string,unknown>}
type Product={room_id:string;product_id:string;position:number;is_pinned:boolean;pinned_at:string|null;products?:{id:string;title:string;price:number;image_url:string|null}|null}

export default function LivePage(){
  const [rooms,setRooms]=useState<Room[]>([])
  const [discovery,setDiscovery]=useState<Room[]>([])
  const [title,setTitle]=useState('Nueva sesión Credi LIVE')
  const [description,setDescription]=useState('')
  const [scheduledAt,setScheduledAt]=useState('')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [selected,setSelected]=useState<Room|null>(null)
  const [products,setProducts]=useState<Product[]>([])
  const [productId,setProductId]=useState('')
  const [cameraOn,setCameraOn]=useState(false)
  const [mediaReady,setMediaReady]=useState(false)
  const previewRef=useRef<HTMLVideoElement>(null)
  const streamRef=useRef<MediaStream|null>(null)
  const [transport,setTransport]=useState<{inputId:string;rtmps:{url:string;streamKey:string}|null;playback:{hls?:string;dash?:string}|null;webRTC:{url:string}|null;status?:string|null;enabled?:boolean}|null>(null)
  const [transportBusy,setTransportBusy]=useState(false)
  const [captureDevice,setCaptureDevice]=useState('')
  const [captureDevices,setCaptureDevices]=useState<MediaDeviceInfo[]>([])

  async function load(){
    const response=await fetch('/api/live',{cache:'no-store'})
    if(response.status===401){window.location.assign('/login?next=%2Flive');return}
    const data=await response.json().catch(()=>({}))
    if(!response.ok)throw new Error(data.error||'No fue posible cargar Credi LIVE.')
    setRooms(data.rooms||[])
    setDiscovery(data.discovery||[])
    setSelected((current)=>current||data.rooms?.[0]||null)
  }

  async function loadTransport(roomId:string){
    const response=await fetch('/api/live/stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomId,action:'credentials'})})
    const data=await response.json().catch(()=>({}))
    if(response.ok)setTransport(data)
    else setTransport(null)
  }

  async function loadProducts(roomId:string){
    const response=await fetch('/api/live/products?roomId='+encodeURIComponent(roomId),{cache:'no-store'})
    if(!response.ok){setProducts([]);return}
    const data=await response.json().catch(()=>({products:[]}))
    setProducts(data.products||[])
  }

  useEffect(()=>{void load().catch(e=>setMessage(e instanceof Error?e.message:'No fue posible cargar Credi LIVE.'))},[])
  useEffect(()=>{if(selected){void loadProducts(selected.id);void loadTransport(selected.id)}},[selected?.id])

  async function preflight(){
    if(cameraOn){
      streamRef.current?.getTracks().forEach(track=>track.stop())
      streamRef.current=null
      setCameraOn(false)
      setMediaReady(false)
      if(previewRef.current)previewRef.current.srcObject=null
      return
    }
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){
      setMessage('La prueba de cámara requiere HTTPS y permisos del navegador.')
      return
    }
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:captureDevice?{deviceId:{exact:captureDevice},width:{ideal:1920},height:{ideal:1080}}:{facingMode:'user',width:{ideal:1920},height:{ideal:1080}},audio:true})
      streamRef.current=stream
      if(previewRef.current){previewRef.current.srcObject=stream;await previewRef.current.play().catch(()=>{})}
      setCameraOn(true)
      const devices=await navigator.mediaDevices.enumerateDevices()
      setCaptureDevices(devices.filter(device=>device.kind==='videoinput'))
      setMediaReady(true)
      setMessage('Fuente de captura y audio listos. Para producción, OBS puede tomar la señal de Elgato 4K Pro y enviarla por RTMPS a Credi LIVE.')
    }catch(error){setMessage(error instanceof Error?error.message:'No fue posible activar cámara y micrófono.')}
  }

  async function createRoom(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault()
    setBusy(true);setMessage('')
    try{
      const response=await fetch('/api/live',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        title,description,scheduledAt:scheduledAt?new Date(scheduledAt).toISOString():null,coverMedia:[]
      })})
      const data=await response.json().catch(()=>({}))
      if(data.transport)setTransport(data.transport)
      if(response.status===401){window.location.assign('/login?next=%2Flive');return}
      if(!response.ok)throw new Error(data.error||'No fue posible crear el LIVE.')
      setMessage(data.room.status==='scheduled'?'LIVE programado correctamente.':'Sala LIVE creada y lista para el estudio.')
      setTitle('Nueva sesión Credi LIVE');setDescription('');setScheduledAt('')
      setSelected(data.room);await load()
    }catch(error){setMessage(error instanceof Error?error.message:'No fue posible crear el LIVE.')}
    finally{setBusy(false)}
  }

  async function updateRoom(roomId:string,action:'start'|'end'|'cancel'){
    setBusy(true);setMessage('')
    try{
      const response=await fetch('/api/live',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomId,action})})
      const data=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(data.error||'No fue posible actualizar el LIVE.')
      setSelected(data.room)
      setMessage(action==='end'?'LIVE finalizado correctamente.':'LIVE actualizado correctamente.')
      await load()
    }catch(error){setMessage(error instanceof Error?error.message:'No fue posible actualizar el LIVE.')}
    finally{setBusy(false)}
  }

  async function addProduct(pinned:boolean){
    if(!selected||!productId)return
    const response=await fetch('/api/live/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomId:selected.id,productId,position:products.length,pinned})})
    const data=await response.json().catch(()=>({}))
    if(!response.ok){setMessage(data.error||'No fue posible añadir el producto.');return}
    setProductId('')
    await loadProducts(selected.id)
    setMessage(pinned?'Producto fijado en LIVE.':'Producto añadido al escaparate LIVE.')
  }

  async function removeProduct(id:string){
    if(!selected)return
    const response=await fetch('/api/live/products',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomId:selected.id,productId:id})})
    const data=await response.json().catch(()=>({}))
    if(!response.ok){setMessage(data.error||'No fue posible quitar el producto.');return}
    await loadProducts(selected.id)
  }

  useEffect(()=>()=>streamRef.current?.getTracks().forEach(track=>track.stop()),[])

  return <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        <div className="bg-gradient-to-br from-slate-950 via-brand-950 to-cyan-950 px-6 py-10 text-white sm:px-10 sm:py-12">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[.18em] text-cyan-100"><Radio className="size-4"/> Credi LIVE Commerce</span>
              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Studio LIVE pensado para vender, conversar y medir.</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">Programa eventos, prepara cámara y micrófono, organiza productos, fija ofertas y controla la experiencia desde Credi.</p>
            </div>
            <button type="button" onClick={()=>void preflight()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg hover:bg-cyan-200">{cameraOn?<CircleStop className="size-4"/>:<Camera className="size-4"/>}{cameraOn?'Detener prueba':'Probar cámara y micrófono'}</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-4">
          {[['Tus LIVE',rooms.length],['En vivo',discovery.length],['Espectadores',selected?.viewer_count??0],['Pico',selected?.viewer_peak??0]].map(([label,value])=><div key={String(label)} className="bg-[var(--surface)] p-5"><p className="text-[11px] font-black uppercase tracking-[.14em] text-[var(--muted)]">{label}</p><p className="mt-1 text-2xl font-black">{String(value)}</p></div>)}
        </div>
      </header>

      {message&&<p role="status" className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4 text-sm">{message}</p>}

      <div className="grid gap-7 lg:grid-cols-[1.35fr_.85fr]">
        <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl sm:p-7">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--primary)]">Control Room</p><h2 className="mt-1 text-2xl font-black">{selected?.title||'Selecciona o crea un LIVE'}</h2></div>{selected&&<span className="rounded-full bg-[var(--primary)]/10 px-3 py-1.5 text-xs font-black uppercase text-[var(--primary)]">{selected.status}</span>}</div>

          <div className="mt-5 aspect-video overflow-hidden rounded-[1.5rem] bg-slate-950">
            {selected?.playback_url?<video src={selected.playback_url} controls playsInline className="h-full w-full object-cover"/>:
              <div className="relative flex h-full flex-col items-center justify-center p-8 text-center text-white">
                {cameraOn&&<video ref={previewRef} muted playsInline className="absolute inset-0 h-full w-full object-cover"/>}
                <div className="relative z-10 max-w-md rounded-2xl bg-slate-950/75 px-5 py-4 backdrop-blur-md">
                  <Video className="mx-auto size-9 text-cyan-300"/>
                  <p className="mt-2 font-black">{mediaReady?'Preflight listo':'Transporte LIVE de producción'}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">{mediaReady?'Cámara y micrófono verificados.':'La entrega multipunto requiere conectar el adaptador de streaming de producción; Credi ya conserva la sala, eventos, productos, chat y replay.'}</p>
                </div>
              </div>}
          </div>

          {selected&&<div className="mt-5 flex flex-wrap gap-2">
            {selected.status==='scheduled'&&<button type="button" onClick={()=>void updateRoom(selected.id,'start')} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-black text-white"><Play className="size-4"/> Iniciar LIVE</button>}
            {selected.status==='live'&&<button type="button" onClick={()=>void updateRoom(selected.id,'end')} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white"><CircleStop className="size-4"/> Finalizar LIVE</button>}
            {selected.status==='scheduled'&&<button type="button" onClick={()=>void updateRoom(selected.id,'cancel')} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-xs font-black">Cancelar</button>}
          </div>}

          {selected&&<section className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/[.04] p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-cyan-700">Transporte de producción</p><h3 className="mt-1 font-black">Elgato 4K Pro → OBS → Credi LIVE</h3><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Credi genera el Live Input de Cloudflare. La capturadora Elgato entra a OBS, y OBS publica la señal por RTMPS.</p></div><KeyRound className="size-5 text-cyan-700"/></div>
            <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={transportBusy} onClick={async()=>{setTransportBusy(true);try{const r=await fetch('/api/live/stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomId:selected.id,action:'provision'})});const d=await r.json();if(!r.ok)throw new Error(d.error||'No fue posible provisionar el transporte.');setTransport(d);setMessage('Transporte Cloudflare provisionado. Configura OBS con la URL y clave RTMPS mostradas.')}catch(e){setMessage(e instanceof Error?e.message:'No fue posible provisionar el transporte.')}finally{setTransportBusy(false)}}} className="rounded-xl bg-cyan-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50">{transportBusy?'Provisionando…':'Provisionar transporte'}</button>{transport?.rtmps?.url&&<span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/10 px-3 py-2 text-[10px] font-black text-emerald-700"><Eye className="size-3"/> RTMPS listo</span>}</div>
            {transport?.rtmps&&<div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Servidor RTMPS<input readOnly value={transport.rtmps.url} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-mono"/></label><label className="text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Stream Key<input readOnly value={transport.rtmps.streamKey} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-mono"/></label></div>}
            <p className="mt-3 text-[10px] text-[var(--muted)]">La clave se obtiene del backend autenticado; no se almacena en Supabase ni se expone al cliente público. Si fue compartida accidentalmente, usa rotación de credenciales.</p>
          </section>

          {selected&&<div className="mt-6 grid gap-3 sm:grid-cols-4">{([
            [Users,selected.viewer_count,'Espectadores'],
            [Heart,selected.likes_count,'Reacciones'],
            [MessageCircle,'Activo','Chat'],
            [BarChart3,selected.viewer_peak,'Pico'],
          ] satisfies Array<[LucideIcon,number | string,string]>).map(([Icon,value,label])=><div key={label} className="rounded-xl bg-[var(--surface-secondary)] p-3"><Icon className="size-4 text-[var(--primary)]"/><p className="mt-2 text-sm font-black">{String(value)}</p><p className="text-[10px] text-[var(--muted)]">{label}</p></div>)}</div>}
        </section>
        </section>

        <aside className="space-y-5">
          <form onSubmit={createRoom} className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl sm:p-6">
            <div className="flex items-center gap-2"><Sparkles className="size-5 text-[var(--primary)]"/><h2 className="font-black">Programar / crear LIVE</h2></div>
            <label className="mt-4 block text-sm font-bold">Título<input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={160} className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3"/></label>
            <label className="mt-4 block text-sm font-bold">Descripción<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={4} maxLength={2000} className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3"/></label>
            <label className="mt-4 block text-sm font-bold"><span className="flex items-center gap-2"><CalendarClock className="size-4"/> Fecha futura opcional</span><input type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3"/></label>
            <button disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-black text-white disabled:opacity-50"><Radio className="size-4"/>{scheduledAt?'Programar LIVE':'Crear LIVE ahora'}</button>
          </form>

          <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl">
            <div className="flex items-center gap-2"><Package className="size-5 text-[var(--primary)]"/><h2 className="font-black">Shop LIVE</h2></div>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Productos propios, disponibles y con stock. Solo uno puede permanecer fijado.</p>
            <input value={productId} onChange={e=>setProductId(e.target.value)} placeholder="ID del producto" className="mt-4 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-sm"/>
            <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={()=>void addProduct(false)} disabled={!selected||!productId} className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-xs font-black disabled:opacity-40">Añadir</button><button type="button" onClick={()=>void addProduct(true)} disabled={!selected||!productId} className="rounded-xl bg-[var(--primary)] px-3 py-2.5 text-xs font-black text-white disabled:opacity-40">Fijar</button></div>
            <div className="mt-4 space-y-2">{products.map(p=><div key={p.product_id} className="flex items-center gap-3 rounded-xl bg-[var(--surface-secondary)] p-3"><div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{p.products?.title||p.product_id}</p><p className="text-[10px] text-[var(--muted)]">{p.products?.price!=null?String(p.products.price):'—'}{p.is_pinned?' · FIJADO':''}</p></div><button type="button" onClick={()=>void removeProduct(p.product_id)} className="rounded-lg px-2 py-1 text-[10px] font-black text-rose-600 hover:bg-rose-500/10">Quitar</button></div>)}</div>
          </section>
        </aside>
      </div>

      {selected&&<section className="grid gap-7 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl sm:p-7">
          <p className="text-xs font-black uppercase tracking-[.16em] text-[var(--primary)]">Experiencia social</p>
          <h2 className="mt-1 text-2xl font-black">Credi LIVE · conversación en tiempo real</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Un solo espacio para mirar, comentar, reaccionar y descubrir productos. Los mensajes persistentes viven en Supabase y se actualizan mediante Realtime, sin crear un segundo portal.</p>
        </div>
        <CrediLiveChat roomId={selected.id} active={selected.status==='live'}/>
      </section>}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
        [ShieldCheck,'Moderación','Moderadores y palabras bloqueadas para proteger la conversación.'],
        [MessageCircle,'Chat realtime','Comentarios y conversación integrados en Credi Chat.'],
        [Package,'Shop LIVE','Secuencia de productos, fijación y navegación comercial.'],
        [BarChart3,'Analítica','Espectadores, pico, reacciones, ventas y atribución preparados.']
      ].map(([Icon,label,body])=><article key={String(label)} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><Icon className="size-5 text-[var(--primary)]"/><h2 className="mt-3 font-black">{String(label)}</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{String(body)}</p></article>)}</section>

      <section className="rounded-[2rem] border border-cyan-300/10 bg-cyan-300/[.04] p-6 sm:p-8"><p className="text-xs font-black uppercase tracking-[.16em] text-cyan-700">Arquitectura</p><h2 className="mt-2 text-2xl font-black">LIVE Commerce + Marketing + Credi Chat</h2><p className="mt-2 max-w-4xl text-sm leading-7 text-[var(--muted)]">Las sesiones LIVE quedan dentro de la misma identidad. Una transmisión puede ser el destino de una campaña, mostrar productos del Marketplace, abrir conversación, dirigir a checkout y dejar replay para contenido posterior.</p></section>

      <section><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--primary)]">Descubrir</p><h2 className="mt-1 text-2xl font-black">LIVE activos</h2></div><span className="text-xs text-[var(--muted)]">{discovery.length} en vivo</span></div>{discovery.length?<div className="grid gap-4 md:grid-cols-2">{discovery.map(room=><article key={room.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex items-center justify-between"><span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-rose-600">● LIVE</span><span className="text-xs text-[var(--muted)]">{room.viewer_count} espectadores</span></div><h3 className="mt-3 font-black">{room.title}</h3><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{room.description||'Comercio en vivo en Credi.'}</p></article>)}</div>:<div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">No hay LIVE activos en este momento.</div>}</section>
    </div>
  </main>
}
