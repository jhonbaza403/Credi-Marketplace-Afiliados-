'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Flame, Heart, MessageCircle, Send, ThumbsUp, Wifi, WifiOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Profile={id:string;full_name:string|null;avatar_url:string|null}
type Message={id:string;room_id:string;sender_id:string;body:string;created_at:string;profiles?:Profile|Profile[]|null}

const reactions=['❤️','👍','🔥','👏','😂','😍'] as const

function profileOf(message:Message):Profile|undefined{
  return Array.isArray(message.profiles)?message.profiles[0]:message.profiles??undefined
}

export function CrediLiveChat({roomId,active=true}:{roomId:string;active?:boolean}){
  const [messages,setMessages]=useState<Message[]>([])
  const [draft,setDraft]=useState('')
  const [sending,setSending]=useState(false)
  const [connected,setConnected]=useState(false)
  const [error,setError]=useState('')
  const bottomRef=useRef<HTMLDivElement>(null)
  const supabase=useMemo(()=>createClient(),[])

  useEffect(()=>{
    let mounted=true
    async function load(){
      const response=await fetch('/api/live/chat?roomId='+encodeURIComponent(roomId),{cache:'no-store'})
      const data=await response.json().catch(()=>({}))
      if(mounted&&response.ok)setMessages(data.messages??[])
      if(mounted&&!response.ok)setError(data.error||'No fue posible cargar el chat.')
    }
    void load()
    if(!active)return()=>{mounted=false}
    const channel=supabase.channel('credi-live-chat:'+roomId)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_live_messages',filter:'room_id=eq.'+roomId},payload=>{
        const next=payload.new as Message
        setMessages(current=>current.some(item=>item.id===next.id)?current:[...current,next].slice(-120))
      })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'chat_live_messages',filter:'room_id=eq.'+roomId},payload=>{
        setMessages(current=>current.filter(item=>item.id!==(payload.old as Message).id))
      })
      .subscribe(status=>{if(mounted)setConnected(status==='SUBSCRIBED')})
    return()=>{mounted=false;void supabase.removeChannel(channel)}
  },[roomId,active,supabase])

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'})},[messages.length])

  async function send(event:FormEvent){
    event.preventDefault()
    const body=draft.trim()
    if(!body||sending)return
    setSending(true);setError('')
    try{
      const response=await fetch('/api/live/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomId,body})})
      const data=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(data.error||'No fue posible publicar el mensaje.')
      setDraft('')
    }catch(e){setError(e instanceof Error?e.message:'No fue posible publicar el mensaje.')}
    finally{setSending(false)}
  }

  async function react(reaction:string){
    await fetch('/api/live/chat',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomId,reaction})})
  }

  return <section className="flex min-h-[620px] flex-col overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-xl">
    <header className="border-b border-[var(--border)] bg-[var(--surface-secondary)] px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]"><MessageCircle className="size-5"/></span><div><h2 className="font-black">Chat en vivo</h2><p className="text-xs text-[var(--muted)]">Conversación social de Credi LIVE</p></div></div>
        <span className={"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase "+(connected?'bg-emerald-500/10 text-emerald-600':'bg-amber-500/10 text-amber-600')}>{connected?<Wifi className="size-3"/>:<WifiOff className="size-3"/>}{connected?'En vivo':'Conectando'}</span>
      </div>
    </header>
    <div className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
      {messages.length===0&&<div className="grid min-h-[360px] place-items-center text-center"><div><MessageCircle className="mx-auto size-10 text-[var(--muted)]"/><p className="mt-3 font-black">Sé parte de la conversación</p><p className="mt-1 text-xs text-[var(--muted)]">Los comentarios aparecen aquí en tiempo real.</p></div></div>}
      {messages.map(message=>{const profile=profileOf(message);const name=profile?.full_name?.trim()||'Usuario Credi';return <article key={message.id} className="flex gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-[var(--surface-secondary)]"><div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--primary)]/10 text-xs font-black text-[var(--primary)]">{profile?.avatar_url?<img src={profile.avatar_url} alt="" className="h-full w-full object-cover"/>:name.slice(0,1).toUpperCase()}</div><div className="min-w-0"><div className="flex items-baseline gap-2"><span className="text-xs font-black">{name}</span><time className="text-[10px] text-[var(--muted)]">{new Date(message.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time></div><p className="mt-0.5 break-words text-sm leading-5">{message.body}</p></div></article>})}
      <div ref={bottomRef}/>
    </div>
    {error&&<p role="alert" className="border-t border-[var(--border)] px-4 py-2 text-xs text-rose-600">{error}</p>}
    <div className="border-t border-[var(--border)] p-3">
      <div className="mb-2 flex items-center gap-1">{reactions.map(reaction=><button key={reaction} type="button" onClick={()=>void react(reaction)} aria-label={'Reaccionar '+reaction} className="grid size-8 place-items-center rounded-full hover:bg-[var(--surface-secondary)]">{reaction}</button>)}<span className="ml-auto flex items-center gap-1 text-[10px] text-[var(--muted)]"><Heart className="size-3"/> Reacciona al LIVE</span></div>
      <form onSubmit={send} className="flex items-end gap-2"><textarea value={draft} onChange={e=>setDraft(e.target.value)} maxLength={500} rows={1} placeholder="Escribe un comentario…" className="min-h-11 max-h-28 flex-1 resize-none rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/30"/><button type="submit" disabled={!draft.trim()||sending||!active} className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--primary)] text-white disabled:opacity-40" aria-label="Enviar comentario"><Send className="size-4"/></button></form>
    </div>
  </section>
}
