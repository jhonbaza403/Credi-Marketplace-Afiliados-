'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Radio, Send, Users, Video, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type LiveRoom = {
  id: string
  host_user_id: string
  conversation_id: string | null
  title: string
  status: 'live' | 'ended'
  started_at: string
}

type LiveMessage = {
  id: string
  room_id: string
  sender_id: string
  body: string
  created_at: string
}

export default function CrediLiveChatPanel() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), [])
  const conversationId = params.get('conversation')
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [room, setRoom] = useState<LiveRoom | null>(null)
  const [messages, setMessages] = useState<LiveMessage[]>([])
  const [presenceCount, setPresenceCount] = useState(0)
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRoom = useCallback(async (currentUserId: string) => {
    let query = supabase.from('chat_live_rooms').select('id,host_user_id,conversation_id,title,status,started_at').eq('status', 'live').order('started_at', { ascending: false }).limit(1)
    if (conversationId) query = query.eq('conversation_id', conversationId)
    const { data, error: roomError } = await query.maybeSingle()
    if (roomError) throw roomError
    if (!data) {
      setRoom(null)
      setMessages([])
      setPresenceCount(0)
      return
    }
    const nextRoom = data as LiveRoom
    setRoom(nextRoom)
    const { data: history, error: historyError } = await supabase.from('chat_live_messages').select('id,room_id,sender_id,body,created_at').eq('room_id', nextRoom.id).is('deleted_at', null).order('created_at', { ascending: false }).limit(80)
    if (historyError) throw historyError
    setMessages(((history ?? []) as LiveMessage[]).reverse())
    void currentUserId
  }, [conversationId, supabase])

  useEffect(() => {
    let active = true
    void supabase.auth.getUser().then(({ data, error: authError }) => {
      if (authError) throw authError
      if (!active) return
      if (data.user) {
        setUserId(data.user.id)
        void loadRoom(data.user.id).catch((e) => setError(e instanceof Error ? e.message : 'No fue posible cargar el LIVE.'))
      }
    }).catch((e) => { if (active) setError(e instanceof Error ? e.message : 'No fue posible iniciar Credi LIVE.') })
    return () => { active = false }
  }, [loadRoom, supabase])

  useEffect(() => {
    if (!room || !userId || !open) return
    const topic = `credichat-live-${room.id}`
    const channel = supabase.channel(topic, { config: { private: true, presence: { key: userId } } })
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        const incoming = payload as LiveMessage
        setMessages((current) => current.some((item) => item.id === incoming.id) ? current : [...current, incoming].slice(-120))
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setPresenceCount(Object.values(state).reduce((total, entries) => total + entries.length, 0))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ user_id: userId, joined_at: new Date().toISOString() })
      })
    return () => { void supabase.removeChannel(channel) }
  }, [open, room, supabase, userId])

  async function startLive() {
    if (!userId || busy) return
    setBusy(true)
    setError(null)
    try {
      const { data, error: insertError } = await supabase.from('chat_live_rooms').insert({ host_user_id: userId, conversation_id: conversationId, title: 'Credi Live', status: 'live' }).select('id,host_user_id,conversation_id,title,status,started_at').single()
      if (insertError || !data) throw insertError ?? new Error('No fue posible iniciar el LIVE.')
      setRoom(data as LiveRoom)
      setOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible iniciar el LIVE.')
    } finally { setBusy(false) }
  }

  async function endLive() {
    if (!room || room.host_user_id !== userId) return
    const { error: updateError } = await supabase.from('chat_live_rooms').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', room.id).eq('host_user_id', userId)
    if (updateError) return setError(updateError.message)
    setRoom(null); setMessages([]); setOpen(false)
  }

  async function sendLiveMessage() {
    const body = draft.trim()
    if (!room || !userId || !body || body.length > 280 || busy) return
    setBusy(true); setError(null)
    try {
      const { data, error: insertError } = await supabase.from('chat_live_messages').insert({ room_id: room.id, sender_id: userId, body }).select('id,room_id,sender_id,body,created_at').single()
      if (insertError || !data) throw insertError ?? new Error('No fue posible enviar el comentario.')
      setMessages((current) => [...current, data as LiveMessage].slice(-120))
      setDraft('')
    } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible enviar el comentario.') }
    finally { setBusy(false) }
  }

  return (
    <section className="mx-auto mt-4 max-w-[1500px] px-3 sm:px-6">
      <div className="overflow-hidden rounded-[1.75rem] border border-fuchsia-300/15 bg-[linear-gradient(135deg,rgba(168,85,247,.10),rgba(34,211,238,.06),rgba(5,8,22,.98))] shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-fuchsia-400/10 text-fuchsia-200"><Radio size={21} /></span>
            <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.2em] text-fuchsia-200">Credi LIVE</p><h2 className="truncate text-lg font-black text-white">Chat en vivo estilo social</h2></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/catalogo-video" className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[.06] px-3 py-2 text-xs font-black text-cyan-100 hover:bg-cyan-300/[.10]"><Video size={15} /> Cargar catálogo en video</Link>
            {room ? <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-fuchsia-400 px-3 py-2 text-xs font-black text-slate-950"><Users size={15} /> {presenceCount || 0} en vivo</button> : <button type="button" onClick={() => void startLive()} disabled={!userId || busy} className="inline-flex items-center gap-2 rounded-xl bg-fuchsia-400 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-50"><Radio size={15} /> Iniciar LIVE</button>}
          </div>
        </div>
        {open && room && <div className="grid gap-4 border-t border-white/10 p-4 lg:grid-cols-[1fr_auto]">
          <div className="min-h-64 max-h-96 overflow-y-auto rounded-2xl border border-white/10 bg-black/25 p-3">
            <div className="space-y-2">{messages.length ? messages.map((message) => <div key={message.id} className="rounded-xl bg-white/[.045] px-3 py-2"><p className="text-xs text-slate-200">{message.body}</p><p className="mt-1 text-[9px] text-slate-500">{new Date(message.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</p></div>) : <p className="py-16 text-center text-xs text-slate-500">El LIVE está abierto. Sé el primero en comentar.</p>}</div>
          </div>
          <div className="flex min-w-0 flex-col gap-3 lg:w-80">
            <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[.04] p-3 text-xs text-emerald-100"><strong>● En vivo</strong><p className="mt-1 text-emerald-100/70">Presencia en tiempo real y comentarios moderables.</p></div>
            {room.host_user_id === userId && <button type="button" onClick={() => void endLive()} className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-2.5 text-xs font-black text-rose-100">Finalizar LIVE</button>}
            <div className="flex gap-2"><textarea value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 280))} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendLiveMessage() } }} rows={3} placeholder="Escribe en el chat en vivo…" className="min-h-24 flex-1 rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-xs text-white outline-none placeholder:text-slate-500"/><button type="button" onClick={() => void sendLiveMessage()} disabled={!draft.trim() || busy} className="self-end rounded-xl bg-cyan-300 p-3 text-slate-950 disabled:opacity-40" aria-label="Enviar comentario en vivo"><Send size={16}/></button></div>
            {error && <div className="flex items-start justify-between gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-xs text-rose-100"><span>{error}</span><button type="button" onClick={() => setError(null)} aria-label="Cerrar"><X size={14}/></button></div>}
          </div>
        </div>}
      </div>
    </section>
  )
}
