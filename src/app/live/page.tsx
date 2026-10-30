'use client'

import { useEffect, useRef, useState } from 'react'
import { BarChart3, CalendarClock, Camera, CircleStop, Eye, Heart, KeyRound, MessageCircle, Package, Play, Radio, ShieldCheck, Sparkles, Users, Video } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import DomainBridge from '@/components/portal/DomainBridge'
import { CrediLiveChat } from '@/components/live/CrediLiveChat'

type Room={id:string;host_user_id:string;title:string;status:string;viewer_count:number;started_at:string|null;ended_at?:string|null;description:string;cover_media:unknown;scheduled_at:string|null;replay_url:string|null;playback_url:string|null;stream_provider:string;viewer_peak:number;likes_count:number;shares_count:number;settings:Record<string,unknown>}
type Product={room_id:string;product_id:string;position:number;is_pinned:boolean;pinned_at:string|null;products?:{id:string;title:string;price:number;image_url:string|null}|null}
type LiveTransport={inputId:string;rtmps:{url:string;streamKey:string}|null;srt:{url:string;streamId:string;passphrase:string}|null;playback:{hls?:string;dash?:string}|null;status?:string|null;statusCategory?:string;enabled?:boolean;diagnostics?:{state:string;status:string;enabled:boolean;ingest:{rtmps:boolean;srt:boolean};playback:{hls:boolean;dash:boolean};recording:string;checkedAt:string}}
type ReplaySync={state:'ready'|'processing'|'not_found';videoId:string|null;playbackUrl:string|null;dashUrl:string|null;checkedAt:string}

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
  const [transport,setTransport]=useState<LiveTransport|null>(null)
  const [transportBusy,setTransportBusy]=useState(false)
  const [ingestProtocol,setIngestProtocol]=useState<'rtmps'|'srt'>('rtmps')
  const [replaySync,setReplaySync]=useState<ReplaySync|null>(null)

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
    const response=await fetch('/api/live/stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomId,action:'diagnostics'})})
    const data=await response.json().catch(()=>({}))
    if(response.ok)setTransport(data)
    else setTransport(null)
  }

  async function operateTransport(action:'provision'|'diagnostics'|'recover'|'sync-replay'){
    if(!selected)return
    setTransportBusy(true)
    try{
      const response=await fetch('/api/live/stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomId:selected.id,action})})
      const data=await response.json().catch(()=>({}))
      if(response.status===401){window.location.assign('/login?next=%2Flive');return}
      if(!response.ok)throw new Error(data.error||'No fue posible operar el transporte.')
      if(action==='sync-replay'){
        setReplaySync(data.replaySync||null)
        if(data.replaySync?.state==='ready'){
          setSelected(current=>current?{...current,replay_url:data.replaySync.playbackUrl}:current)
          setMessage('Replay sincronizado y disponible en la sala.')
        }else if(data.replaySync?.state==='processing'){
          setMessage('Cloudflare está procesando la grabación. Vuelve a sincronizar en unos instantes.')
        }else{
          setMessage('Todavía no aparece una grabación para esta sesión. Comprueba que la transmisión haya terminado y vuelve a intentar.')
        }
      }else{
        setTransport(data)
        if(action==='provision')setMessage('Entrada Cloudflare provisionada. Elige RTMPS o SRT y configura tu codificador. La sala no se marcará como LIVE hasta recibir señal.')
        if(action==='diagnostics')setMessage('Diagnóstico actualizado desde Cloudflare Stream.')
        if(action==='recover')setMessage(data.recovered?'Entrada reactivada. Comprueba el codificador y vuelve a diagnosticar.':'La entrada ya estaba habilitada. El diagnóstico indica el estado actual del proveedor.')
      }
    }catch(error){setMessage(error instanceof Error?error.message:'No fue posible operar el transporte.')}
    finally{setTransportBusy(false)}
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
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1080},height:{ideal:1920}},audio:true})
      streamRef.current=stream
      if(previewRef.current){previewRef.current.srcObject=stream;await previewRef.current.play().catch(()=>{})}
      setCameraOn(true)
      setMediaReady(true)
      setMessage('Fuente de cámara y audio listas para previsualización vertical. Para transmitir, usa un codificador compatible con RTMPS o SRT y las credenciales privadas de esta sala.')
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
      setMessage(
        scheduledAt
          ? 'LIVE programado. Antes de la hora de inicio, verifica el estado de Cloudflare Stream en este panel y prepara un codificador RTMPS o SRT.'
          : data.transport
            ? 'Sala preparada. Todavía no está transmitiendo: inicia tu codificador con RTMPS o SRT; Credi marcará LIVE al confirmar la señal.'
            : 'No hay transporte de transmisión disponible. Configura Cloudflare Stream en Vercel antes de intentar transmitir.'
      )
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
      <DomainBridge context="live" />
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

          <div className="mx-auto mt-5 aspect-[9/16] max-h-[70vh] max-w-[405px] overflow-hidden rounded-[1.5rem] bg-slate-950">
            {selected?.playback_url?<video src={selected.playback_url} controls playsInline className="h-full w-full object-cover"/>:
              <div className="relative flex h-full flex-col items-center justify-center p-8 text-center text-white">
                {cameraOn&&<video ref={previewRef} muted playsInline className="absolute inset-0 h-full w-full object-cover"/>}
                <div className="relative z-10 max-w-md rounded-2xl bg-slate-950/75 px-5 py-4 backdrop-blur-md">
                  <Video className="mx-auto size-9 text-cyan-300"/>
                  <p className="mt-2 font-black">{mediaReady?'Preflight listo':'Transporte LIVE de producción'}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">{mediaReady?'Cámara y micrófono verificados.':'Provisiona Cloudflare Stream para obtener RTMPS y SRT, comprobar la conexión y sincronizar automáticamente la grabación de cada sesión.'}</p>
                </div>
              </div>}
          </div>

          {selected&&<div className="mt-5 flex flex-wrap gap-2">
            {selected.status==='scheduled'&&<button type="button" onClick={()=>void updateRoom(selected.id,'start')} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-black text-white"><Play className="size-4"/> Iniciar LIVE</button>}
            {selected.status==='live'&&<button type="button" onClick={()=>void updateRoom(selected.id,'end')} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white"><CircleStop className="size-4"/> Finalizar LIVE</button>}
            {selected.status==='scheduled'&&<button type="button" onClick={()=>void updateRoom(selected.id,'cancel')} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-xs font-black">Cancelar</button>}
          </div>}

          {selected&&<section className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/[.04] p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-cyan-700">Adaptador Credi · Cloudflare Stream</p><h3 className="mt-1 font-black">Entrada profesional multiprotocolo</h3><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Vercel ejecuta el adaptador seguro; Cloudflare recibe y distribuye el vídeo; Supabase conserva el estado de sala y el replay.</p></div><KeyRound className="size-5 text-cyan-700"/></div>

            <div className="mt-4 flex flex-wrap gap-2">
              {!transport&&<button type="button" disabled={transportBusy} onClick={()=>void operateTransport('provision')} className="rounded-xl bg-cyan-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50">{transportBusy?'Provisionando…':'Provisionar entrada LIVE'}</button>}
              {transport&&<><button type="button" disabled={transportBusy} onClick={()=>void operateTransport('diagnostics')} className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-black disabled:opacity-50">Diagnosticar conexión</button><button type="button" disabled={transportBusy} onClick={()=>void operateTransport('recover')} className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-black disabled:opacity-50">Recuperar entrada</button><button type="button" disabled={transportBusy} onClick={()=>void operateTransport('sync-replay')} className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-black disabled:opacity-50">Sincronizar replay</button></>}
            </div>

            {transport&&<div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Estado del transporte</p><span className="rounded-full bg-[var(--surface-secondary)] px-3 py-1 text-[10px] font-black uppercase">{transport.statusCategory||'sin diagnóstico'} · {transport.enabled?'habilitado':'deshabilitado'}</span></div>
              <p className="mt-2 text-xs leading-5">{transport.status||'Cloudflare aún no informa un estado de conexión.'} · Grabación: {transport.diagnostics?.recording||'automática'}</p>
              <p className="mt-1 text-[10px] text-[var(--muted)]">Última comprobación: {transport.diagnostics?.checkedAt?new Date(transport.diagnostics.checkedAt).toLocaleString():'pendiente'}</p>
            </div>}

            {transport&&<><div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={()=>setIngestProtocol('rtmps')} disabled={!transport.rtmps} className={`rounded-xl px-3 py-2 text-xs font-black ${ingestProtocol==='rtmps'?'bg-cyan-700 text-white':'border border-[var(--border)]'} disabled:opacity-40`}>RTMPS</button>
              <button type="button" onClick={()=>setIngestProtocol('srt')} disabled={!transport.srt} className={`rounded-xl px-3 py-2 text-xs font-black ${ingestProtocol==='srt'?'bg-cyan-700 text-white':'border border-[var(--border)]'} disabled:opacity-40`}>SRT</button>
            </div>
            {ingestProtocol==='rtmps'&&transport.rtmps&&<div className="mt-3 grid gap-3">
              <label className="text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Servidor RTMPS<input readOnly value={transport.rtmps.url} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-mono"/></label>
              <label className="text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Clave privada de emisión<input readOnly type="password" value={transport.rtmps.streamKey} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-mono"/></label>
            </div>}
            {ingestProtocol==='srt'&&transport.srt&&<div className="mt-3 grid gap-3">
              <label className="text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Servidor SRT<input readOnly value={transport.srt.url} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-mono"/></label>
              <label className="text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Stream ID<input readOnly value={transport.srt.streamId} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-mono"/></label>
              <label className="text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Passphrase privada<input readOnly type="password" value={transport.srt.passphrase} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-mono"/></label>
            </div>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Playback HLS<input readOnly value={transport.playback?.hls||''} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-mono"/></label>
              <label className="text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Playback DASH<input readOnly value={transport.playback?.dash||''} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-mono"/></label>
            </div></>}
            <p className="mt-3 text-[10px] leading-5 text-[var(--muted)]">Las credenciales de emisión solo llegan al propietario autenticado de la sala y no se guardan en Supabase. WebRTC WHIP/WHEP no se mezcla con esta entrada grabable: este perfil conserva HLS/DASH y replay automático.</p>
            {replaySync&&<p className="mt-3 rounded-lg bg-[var(--surface)] p-3 text-xs">Replay: <strong>{replaySync.state==='ready'?'disponible':replaySync.state==='processing'?'procesándose':'sin grabación detectada'}</strong>{replaySync.videoId? ` · ID ${replaySync.videoId}`:''}</p>}
          </section>}

          {selected&&<div className="mt-6 grid gap-3 sm:grid-cols-4">{([
            [Users,selected.viewer_count,'Espectadores'],
            [Heart,selected.likes_count,'Reacciones'],
            [MessageCircle,'Activo','Chat'],
            [BarChart3,selected.viewer_peak,'Pico'],
          ] satisfies Array<[LucideIcon,number | string,string]>).map(([Icon,value,label])=><div key={label} className="rounded-xl bg-[var(--surface-secondary)] p-3"><Icon className="size-4 text-[var(--primary)]"/><p className="mt-2 text-sm font-black">{String(value)}</p><p className="text-[10px] text-[var(--muted)]">{label}</p></div>)}</div>}
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
