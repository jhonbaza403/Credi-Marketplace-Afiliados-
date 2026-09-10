'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'

type CallType = 'audio' | 'video'
type CallStatus = 'ringing' | 'connecting' | 'active' | 'ended' | 'declined' | 'missed' | 'failed'
type CallRow = { id: string; conversation_id: string; initiated_by: string; call_type: CallType; status: CallStatus }
type Signal = { id: number; call_id: string; sender_id: string; recipient_id: string; signal_type: 'offer' | 'answer' | 'ice' | 'renegotiate' | 'hangup'; payload: Record<string, unknown> }
type Peer = { id: string; full_name: string | null; avatar_url: string | null }

const TURN_ENDPOINT = '/api/chat/turn'
const TURN_TTL = 45 * 60 * 1000
const MAX_RESTARTS = 2
let cachedIce: RTCIceServer[] | null = null
let cachedAt = 0
let fetching: Promise<RTCIceServer[]> | null = null

async function iceServers() {
  if (cachedIce && Date.now() - cachedAt < TURN_TTL) return cachedIce
  if (fetching) return fetching
  fetching = fetch(TURN_ENDPOINT, { method: 'POST', headers: { Accept: 'application/json' }, cache: 'no-store' })
    .then(async (r) => {
      const body = await r.json().catch(() => ({})) as { iceServers?: RTCIceServer[]; error?: string }
      if (!r.ok || !body.iceServers?.length) throw new Error(body.error || 'No fue posible preparar la conexión de llamada.')
      cachedIce = body.iceServers
      cachedAt = Date.now()
      return cachedIce
    })
    .finally(() => { fetching = null })
  return fetching
}

export default function CrediCallManager({ conversationId = null, peerUserId = null, peerName = 'Credi Business Chat' }: { conversationId?: string | null; peerUserId?: string | null; peerName?: string }) {
  const { user } = useAuth()
  const pathname = usePathname()
  const supabase = useRef(createClient()).current
  const pc = useRef<RTCPeerConnection | null>(null)
  const local = useRef<MediaStream | null>(null)
  const activeId = useRef<string | null>(null)
  const peer = useRef<Peer | null>(null)
  const pendingIce = useRef<RTCIceCandidateInit[]>([])
  const restartCount = useRef(0)
  const [incoming, setIncoming] = useState<CallRow | null>(null)
  const [incomingPeer, setIncomingPeer] = useState<Peer | null>(null)
  const [call, setCall] = useState<CallRow | null>(null)
  const [callPeer, setCallPeer] = useState<Peer | null>(null)
  const [remote, setRemote] = useState<MediaStream | null>(null)
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clear = useCallback(() => {
    local.current?.getTracks().forEach((track) => track.stop())
    local.current = null
    pc.current?.close()
    pc.current = null
    activeId.current = null
    peer.current = null
    pendingIce.current = []
    restartCount.current = 0
    setRemote(null)
    setCall(null)
    setCallPeer(null)
    setMuted(false)
    setCameraOff(false)
  }, [])

  const resolvePeer = useCallback(async (conv: string) => {
    if (!user) throw new Error('Sesión requerida.')
    const { data, error: memberError } = await supabase.from('conversation_members').select('user_id').eq('conversation_id', conv).neq('user_id', user.id).limit(1)
    if (memberError) throw memberError
    const peerId = data?.[0]?.user_id as string | undefined
    if (!peerId) throw new Error('No se encontró el interlocutor.')
    const { data: profile, error: profileError } = await supabase.from('profiles').select('id,full_name,avatar_url').eq('id', peerId).maybeSingle()
    if (profileError) throw profileError
    return (profile ?? { id: peerId, full_name: null, avatar_url: null }) as Peer
  }, [supabase, user])

  const send = useCallback(async (callId: string, recipient: string, type: Signal['signal_type'], payload: Record<string, unknown>) => {
    if (!user) return
    const { error: signalError } = await supabase.from('chat_call_signals').insert({ call_id: callId, sender_id: user.id, recipient_id: recipient, signal_type: type, payload })
    if (signalError) throw signalError
  }, [supabase, user])

  const finish = useCallback(async (callId: string | null, status: CallStatus) => {
    if (callId && user) {
      await supabase.from('chat_calls').update({ status, ended_at: new Date().toISOString() }).eq('id', callId)
      await supabase.from('chat_call_participants').update({ state: status === 'declined' ? 'declined' : 'left', left_at: new Date().toISOString() }).eq('call_id', callId).eq('user_id', user.id)
      if (peer.current?.id) await send(callId, peer.current.id, 'hangup', {})
    }
    clear(); setIncoming(null); setIncomingPeer(null); setError(null)
  }, [clear, send, supabase, user])

  const setup = useCallback(async (row: CallRow, remoteId: string, offerer: boolean, remotePeer: Peer) => {
    if (!user) throw new Error('Sesión requerida.')
    const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: row.call_type === 'video' })
    local.current = media
    peer.current = remotePeer
    setCallPeer(remotePeer)
    const rtc = new RTCPeerConnection({ iceServers: await iceServers(), iceCandidatePoolSize: 10, bundlePolicy: 'max-bundle', rtcpMuxPolicy: 'require' })
    pc.current = rtc
    media.getTracks().forEach((track) => rtc.addTrack(track, media))
    rtc.onicecandidate = (event) => { if (event.candidate) void send(row.id, remoteId, 'ice', { candidate: event.candidate.toJSON() }).catch(() => undefined) }
    rtc.ontrack = (event) => { const stream = event.streams[0]; if (stream) setRemote(stream) }
    rtc.oniceconnectionstatechange = () => {
      if (rtc.iceConnectionState !== 'failed') return
      if (restartCount.current >= MAX_RESTARTS) { setError('No se pudo recuperar la conexión. Finaliza la llamada e inténtalo nuevamente.'); return }
      restartCount.current += 1
      void (async () => {
        try { const offer = await rtc.createOffer({ iceRestart: true }); await rtc.setLocalDescription(offer); await send(row.id, remoteId, 'renegotiate', { description: offer, attempt: restartCount.current }) }
        catch (e) { console.error('[CrediCall] ICE restart', e) }
      })()
    }
    rtc.onconnectionstatechange = () => {
      if (rtc.connectionState === 'connected') { setCall((c) => c ? { ...c, status: 'active' } : c); void supabase.from('chat_calls').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', row.id) }
      if (rtc.connectionState === 'failed') setError('La conexión de la llamada se perdió.')
    }
    if (offerer) { const offer = await rtc.createOffer(); await rtc.setLocalDescription(offer); await send(row.id, remoteId, 'offer', { description: offer }) }
  }, [send, supabase, user])

  const start = useCallback(async (type: CallType) => {
    if (!conversationId || !peerUserId || !user || call) return
    try {
      setError(null)
      const { data, error: callError } = await supabase.from('chat_calls').insert({ conversation_id: conversationId, initiated_by: user.id, call_type: type, status: 'ringing' }).select('id,conversation_id,initiated_by,call_type,status').single()
      if (callError || !data) throw callError ?? new Error('No fue posible iniciar la llamada.')
      const row = data as CallRow
      const remotePeer: Peer = { id: peerUserId, full_name: peerName, avatar_url: null }
      const { error: participantError } = await supabase.from('chat_call_participants').insert([{ call_id: row.id, user_id: user.id, role: 'initiator', state: 'ringing' }, { call_id: row.id, user_id: peerUserId, role: 'participant', state: 'invited' }])
      if (participantError) throw participantError
      activeId.current = row.id; peer.current = remotePeer; setCall(row); setCallPeer(remotePeer)
      await setup(row, peerUserId, true, remotePeer)
      await supabase.from('chat_calls').update({ status: 'connecting' }).eq('id', row.id)
      setCall((c) => c ? { ...c, status: 'connecting' } : c)
    } catch (e) { clear(); setError(e instanceof Error ? e.message : 'No fue posible iniciar la llamada.') }
  }, [call, clear, conversationId, peerName, peerUserId, setup, supabase, user])

  const accept = useCallback(async () => {
    if (!incoming || !incomingPeer || !user) return
    try {
      setError(null); activeId.current = incoming.id; peer.current = incomingPeer; setCall({ ...incoming, status: 'connecting' }); setCallPeer(incomingPeer); setIncoming(null); setIncomingPeer(null)
      await supabase.from('chat_call_participants').update({ state: 'accepted', joined_at: new Date().toISOString() }).eq('call_id', incoming.id).eq('user_id', user.id)
      await setup(incoming, incomingPeer.id, false, incomingPeer)
      const { data: offer, error: offerError } = await supabase.from('chat_call_signals').select('sender_id,payload').eq('call_id', incoming.id).eq('recipient_id', user.id).eq('signal_type', 'offer').order('id', { ascending: false }).limit(1).maybeSingle()
      if (offerError || !offer) throw offerError ?? new Error('La oferta ya no está disponible.')
      await pc.current?.setRemoteDescription(offer.payload.description as RTCSessionDescriptionInit)
      const connection = pc.current
      if (!connection) throw new Error('No se pudo preparar la conexión de llamada.')
      for (const candidate of pendingIce.current) await connection.addIceCandidate(candidate)
      pendingIce.current = []
      const answer = await connection.createAnswer()
      await connection.setLocalDescription(answer)
      await send(incoming.id, offer.sender_id, 'answer', { description: answer })
      await supabase.from('chat_calls').update({ status: 'connecting' }).eq('id', incoming.id)
    } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible aceptar la llamada.'); await finish(incoming.id, 'failed') }
  }, [finish, incoming, incomingPeer, send, setup, supabase, user])

  useEffect(() => {
    if (!user) return
    const globalIncoming = !conversationId && pathname !== '/chat'
    const contextualIncoming = Boolean(conversationId) && pathname === '/chat'
    if (!globalIncoming && !contextualIncoming) return
    const channel = supabase.channel(`credicall-manager:${user.id}:${conversationId ?? 'global'}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_calls' }, async (payload) => {
        const row = payload.new as CallRow
        if (row.initiated_by === user.id || row.status !== 'ringing' || activeId.current || incoming) return
        if (contextualIncoming && row.conversation_id !== conversationId) return
        try { const remotePeer = await resolvePeer(row.conversation_id); setIncoming(row); setIncomingPeer(remotePeer) } catch (e) { console.error('[CrediCall] incoming peer lookup', e) }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_call_signals', filter: `recipient_id=eq.${user.id}` }, async (payload) => {
        const next = payload.new as Signal
        if (!activeId.current || next.call_id !== activeId.current || !pc.current) return
        const connection = pc.current
        try {
          if (next.signal_type === 'answer') { await connection.setRemoteDescription(next.payload.description as RTCSessionDescriptionInit); return }
          if (next.signal_type === 'ice') { const c = next.payload.candidate as RTCIceCandidateInit; if (connection.remoteDescription) await connection.addIceCandidate(c); else pendingIce.current.push(c); return }
          if (next.signal_type === 'renegotiate') { await connection.setRemoteDescription(next.payload.description as RTCSessionDescriptionInit); const answer = await connection.createAnswer(); await connection.setLocalDescription(answer); await send(next.call_id, next.sender_id, 'answer', { description: answer }); return }
          if (next.signal_type === 'hangup') { setError('La otra persona finalizó la llamada.'); clear() }
        } catch (e) { console.error('[CrediCall] signal', e) }
      }).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [clear, conversationId, incoming, pathname, resolvePeer, send, supabase, user])

  useEffect(() => () => clear(), [clear])

  return (
    <>
      {incoming && <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"><div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950 p-7 text-white shadow-2xl"><div className="mx-auto flex size-20 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-200"><Phone size={32} /></div><p className="mt-5 text-center text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Credi Business Chat</p><h2 className="mt-2 text-center text-2xl font-black">{incomingPeer?.full_name || 'Llamada entrante'}</h2><p className="mt-2 text-center text-sm text-slate-400">{incoming.call_type === 'video' ? 'Videollamada' : 'Llamada de voz'}</p><div className="mt-7 grid grid-cols-2 gap-3"><button type="button" onClick={() => void finish(incoming.id, 'declined')} className="flex items-center justify-center gap-2 rounded-2xl bg-rose-500/15 px-4 py-3 font-black text-rose-100"><PhoneOff size={18} /> Rechazar</button><button type="button" onClick={() => void accept()} className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 font-black text-slate-950"><Phone size={18} /> Aceptar</button></div></div></div>}
      {call && <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/85 p-3 backdrop-blur-md"><div className="relative flex min-h-[520px] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl">{call.call_type === 'video' && remote ? <video autoPlay playsInline className="absolute inset-0 size-full object-cover" ref={(node) => { if (node) node.srcObject = remote }} /> : <div className="absolute inset-0 flex items-center justify-center text-white"><div className="text-center"><div className="mx-auto flex size-24 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-200">{call.call_type === 'video' ? <Video size={34} /> : <Phone size={34} />}</div><p className="mt-5 text-xl font-black">{callPeer?.full_name || peerName}</p><p className="mt-1 text-sm text-slate-400">{call.status === 'active' ? 'Conectado' : 'Conectando…'}</p></div></div>}{call.call_type === 'video' && local.current && <video autoPlay muted playsInline className="absolute right-4 top-4 h-40 w-28 rounded-2xl border border-white/20 object-cover" ref={(node) => { if (node && local.current) node.srcObject = local.current }} />}<div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/85 to-transparent p-7 pt-16"><button type="button" onClick={() => { const tracks = local.current?.getAudioTracks() ?? []; const next = !muted; tracks.forEach((t) => { t.enabled = !next }); setMuted(next) }} className="flex size-12 items-center justify-center rounded-full bg-white/10 text-white" aria-label={muted ? 'Activar micrófono' : 'Silenciar micrófono'}>{muted ? <MicOff size={19} /> : <Mic size={19} />}</button>{call.call_type === 'video' && <button type="button" onClick={() => { const tracks = local.current?.getVideoTracks() ?? []; const next = !cameraOff; tracks.forEach((t) => { t.enabled = !next }); setCameraOff(next) }} className="flex size-12 items-center justify-center rounded-full bg-white/10 text-white" aria-label={cameraOff ? 'Activar cámara' : 'Apagar cámara'}>{cameraOff ? <VideoOff size={19} /> : <Video size={19} />}</button>}<button type="button" onClick={() => void finish(call.id, 'ended')} className="flex size-14 items-center justify-center rounded-full bg-rose-500 text-white" aria-label="Finalizar llamada"><PhoneOff size={22} /></button></div></div></div>}
      {error && !call && !incoming && <div className="fixed bottom-5 right-5 z-[135] max-w-sm rounded-2xl border border-rose-400/20 bg-slate-950 p-4 text-sm text-rose-100 shadow-2xl">{error}<button type="button" className="ml-3 font-black underline" onClick={() => setError(null)}>Cerrar</button></div>}
      {!conversationId && pathname === '/chat' ? null : !conversationId ? null : !call && !incoming && !error ? <div className="flex items-center gap-2"><button type="button" onClick={() => void start('audio')} disabled={!user || !peerUserId} className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-slate-200 disabled:opacity-40" aria-label="Llamada de voz"><Phone size={18} /></button><button type="button" onClick={() => void start('video')} disabled={!user || !peerUserId} className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-slate-200 disabled:opacity-40" aria-label="Videollamada"><Video size={18} /></button></div> : null}
    </>
  )
}
