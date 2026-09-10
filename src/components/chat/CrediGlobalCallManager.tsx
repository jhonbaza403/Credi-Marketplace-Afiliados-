'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Phone, PhoneOff, Video } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import type { RTCIceServer } from '@/types/chat'

type CallRow = {
  id: string
  conversation_id: string
  initiated_by: string
  call_type: 'audio' | 'video'
  status: 'ringing' | 'connecting' | 'active' | 'ended' | 'declined' | 'missed' | 'failed'
}

type SignalRow = {
  id: number
  call_id: string
  sender_id: string
  recipient_id: string
  signal_type: 'offer' | 'answer' | 'ice' | 'renegotiate' | 'hangup' | 'mute' | 'camera' | 'screen'
  payload: Record<string, unknown>
}

type PeerProfile = { id: string; full_name: string | null; avatar_url: string | null }

const TURN_ENDPOINT = '/api/chat/turn'
const TURN_CACHE_MS = 45 * 60 * 1000
const ICE_RESTART_MAX = 2

let cachedIceServers: RTCIceServer[] | null = null
let cachedIceServersAt = 0
let turnRequest: Promise<RTCIceServer[]> | null = null

async function getIceServers(): Promise<RTCIceServer[]> {
  if (cachedIceServers && Date.now() - cachedIceServersAt < TURN_CACHE_MS) return cachedIceServers
  if (turnRequest) return turnRequest
  turnRequest = fetch(TURN_ENDPOINT, { method: 'POST', headers: { Accept: 'application/json' }, cache: 'no-store' })
    .then(async (response) => {
      const payload = await response.json().catch(() => ({})) as { iceServers?: RTCIceServer[]; error?: string }
      if (!response.ok || !Array.isArray(payload.iceServers) || payload.iceServers.length === 0) throw new Error(payload.error || 'No fue posible preparar la red de llamada.')
      cachedIceServers = payload.iceServers
      cachedIceServersAt = Date.now()
      return payload.iceServers
    })
    .finally(() => { turnRequest = null })
  return turnRequest
}

export default function CrediGlobalCallManager() {
  const { user } = useAuth()
  const supabase = useRef(createClient()).current
  const pc = useRef<RTCPeerConnection | null>(null)
  const localStream = useRef<MediaStream | null>(null)
  const remoteVideo = useRef<HTMLVideoElement | null>(null)
  const remoteAudio = useRef<HTMLAudioElement | null>(null)
  const activeCallId = useRef<string | null>(null)
  const peerRef = useRef<PeerProfile | null>(null)
  const restartCount = useRef(0)
  const queuedCandidates = useRef<RTCIceCandidateInit[]>([])
  const [incoming, setIncoming] = useState<CallRow | null>(null)
  const [incomingPeer, setIncomingPeer] = useState<PeerProfile | null>(null)
  const [active, setActive] = useState<CallRow | null>(null)
  const [activePeer, setActivePeer] = useState<PeerProfile | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)

  const cleanup = useCallback(() => {
    localStream.current?.getTracks().forEach((track) => track.stop())
    localStream.current = null
    pc.current?.close()
    pc.current = null
    activeCallId.current = null
    peerRef.current = null
    queuedCandidates.current = []
    restartCount.current = 0
    setRemoteStream(null)
    setActive(null)
    setActivePeer(null)
    setMuted(false)
  }, [])

  const loadPeer = useCallback(async (conversationId: string, selfId: string) => {
    const { data: members, error: memberError } = await supabase
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', selfId)
      .limit(1)
    if (memberError) throw memberError
    const peerId = members?.[0]?.user_id as string | undefined
    if (!peerId) throw new Error('No se encontró el participante de la llamada.')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id,full_name,avatar_url')
      .eq('id', peerId)
      .maybeSingle()
    if (profileError) throw profileError
    return (profile ?? { id: peerId, full_name: null, avatar_url: null }) as PeerProfile
  }, [supabase])

  const sendSignal = useCallback(async (callId: string, recipientId: string, signalType: SignalRow['signal_type'], payload: Record<string, unknown>) => {
    if (!user) return
    const { error: signalError } = await supabase.from('chat_call_signals').insert({ call_id: callId, sender_id: user.id, recipient_id: recipientId, signal_type: signalType, payload })
    if (signalError) throw signalError
  }, [supabase, user])

  const createPeer = useCallback(async (callRow: CallRow, peerId: string, offerer: boolean) => {
    if (!user) throw new Error('Sesión requerida.')
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callRow.call_type === 'video' })
    const iceServers = await getIceServers()
    localStream.current = stream
    peerRef.current = peerRef.current ?? { id: peerId, full_name: null, avatar_url: null }
    const connection = new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 10, bundlePolicy: 'max-bundle', rtcpMuxPolicy: 'require' })
    pc.current = connection
    stream.getTracks().forEach((track) => connection.addTrack(track, stream))
    connection.onicecandidate = (event) => {
      if (event.candidate) void sendSignal(callRow.id, peerId, 'ice', { candidate: event.candidate.toJSON() }).catch(() => undefined)
    }
    connection.ontrack = (event) => {
      const stream = event.streams[0]
      if (stream) {
        setRemoteStream(stream)
        if (remoteVideo.current) remoteVideo.current.srcObject = stream
        if (remoteAudio.current) remoteAudio.current.srcObject = stream
      }
    }
    connection.oniceconnectionstatechange = () => {
      if (connection.iceConnectionState === 'failed' && restartCount.current < ICE_RESTART_MAX) {
        restartCount.current += 1
        void (async () => {
          try {
            const offer = await connection.createOffer({ iceRestart: true })
            await connection.setLocalDescription(offer)
            await sendSignal(callRow.id, peerId, 'renegotiate', { description: offer, reason: 'ice_restart', attempt: restartCount.current })
          } catch (restartError) {
            console.error('[CrediGlobalCall] ICE restart failed', restartError)
          }
        })()
      } else if (connection.iceConnectionState === 'failed') {
        setError('La conexión de la llamada no pudo recuperarse. Puedes finalizarla y volver a intentarlo.')
      }
    }
    connection.onconnectionstatechange = () => {
      if (connection.connectionState === 'connected') {
        void supabase.from('chat_calls').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', callRow.id)
        setActive((current) => current ? { ...current, status: 'active' } : current)
      }
      if (connection.connectionState === 'failed') setError('La conexión de la llamada se perdió.')
    }
    if (offerer) {
      const offer = await connection.createOffer()
      await connection.setLocalDescription(offer)
      await sendSignal(callRow.id, peerId, 'offer', { description: offer })
    }
    return connection
  }, [sendSignal, supabase, user])

  const finish = useCallback(async (callId: string, status: CallRow['status']) => {
    if (user) {
      await supabase.from('chat_calls').update({ status, ended_at: new Date().toISOString() }).eq('id', callId)
      await supabase.from('chat_call_participants').update({ state: status === 'declined' ? 'declined' : 'left', left_at: new Date().toISOString() }).eq('call_id', callId).eq('user_id', user.id)
      const peer = peerRef.current?.id
      if (peer) await sendSignal(callId, peer, 'hangup', {})
    }
    cleanup()
    setIncoming(null)
    setIncomingPeer(null)
    setError(null)
  }, [cleanup, sendSignal, supabase, user])

  const accept = useCallback(async () => {
    if (!incoming || !user || !incomingPeer) return
    try {
      setError(null)
      activeCallId.current = incoming.id
      peerRef.current = incomingPeer
      setActive(incoming)
      setActivePeer(incomingPeer)
      setIncoming(null)
      setIncomingPeer(null)
      await supabase.from('chat_call_participants').update({ state: 'accepted', joined_at: new Date().toISOString() }).eq('call_id', incoming.id).eq('user_id', user.id)
      await createPeer(incoming, incomingPeer.id, false)
      const { data: signal, error: signalError } = await supabase.from('chat_call_signals').select('sender_id,payload').eq('call_id', incoming.id).eq('recipient_id', user.id).eq('signal_type', 'offer').order('id', { ascending: false }).limit(1).maybeSingle()
      if (signalError || !signal) throw signalError ?? new Error('La invitación de llamada ya no está disponible.')
      const description = signal.payload.description as RTCSessionDescriptionInit
      await pc.current?.setRemoteDescription(description)
      for (const candidate of queuedCandidates.current) await pc.current?.addIceCandidate(candidate)
      queuedCandidates.current = []
      const answer = await pc.current?.createAnswer()
      if (!answer) throw new Error('No fue posible responder la llamada.')
      await pc.current?.setLocalDescription(answer)
      await sendSignal(incoming.id, signal.sender_id, 'answer', { description: answer })
      await supabase.from('chat_calls').update({ status: 'connecting' }).eq('id', incoming.id)
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : 'No fue posible aceptar la llamada.')
      await finish(incoming.id, 'failed')
    }
  }, [createPeer, finish, incoming, incomingPeer, sendSignal, supabase, user])

  useEffect(() => {
    if (!user) return
    let mounted = true
    const channel = supabase.channel(`crediglobal-calls:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_calls' }, async (payload) => {
        const call = payload.new as CallRow
        if (call.initiated_by === user.id || call.status !== 'ringing' || incoming || activeCallId.current) return
        try {
          const peer = await loadPeer(call.conversation_id, user.id)
          if (!mounted) return
          setIncoming(call)
          setIncomingPeer(peer)
        } catch (peerError) {
          console.error('[CrediGlobalCall] participant resolution failed', peerError)
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_call_signals', filter: `recipient_id=eq.${user.id}` }, async (payload) => {
        const signal = payload.new as SignalRow
        if (!activeCallId.current || signal.call_id !== activeCallId.current || !pc.current) return
        try {
          if (signal.signal_type === 'answer') {
            await pc.current.setRemoteDescription(signal.payload.description as RTCSessionDescriptionInit)
            return
          }
          if (signal.signal_type === 'ice') {
            const candidate = signal.payload.candidate as RTCIceCandidateInit
            if (pc.current.remoteDescription) await pc.current.addIceCandidate(candidate)
            else queuedCandidates.current.push(candidate)
            return
          }
          if (signal.signal_type === 'renegotiate') {
            await pc.current.setRemoteDescription(signal.payload.description as RTCSessionDescriptionInit)
            const answer = await pc.current.createAnswer()
            await pc.current.setLocalDescription(answer)
            await sendSignal(signal.call_id, signal.sender_id, 'answer', { description: answer })
            return
          }
          if (signal.signal_type === 'hangup') {
            setError('La otra persona finalizó la llamada.')
            cleanup()
          }
        } catch (signalError) {
          console.error('[CrediGlobalCall] signal processing failed', signalError)
        }
      })
      .subscribe()
    return () => { mounted = false; void supabase.removeChannel(channel) }
  }, [cleanup, incoming, loadPeer, sendSignal, supabase, user])

  if (!user || (!incoming && !active && !error)) return null

  return (
    <>
      <audio ref={remoteAudio} autoPlay />
      {incoming && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950 p-7 text-white shadow-2xl">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-200"><Phone size={32} /></div>
            <p className="mt-5 text-center text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Credi Business Chat</p>
            <h2 className="mt-2 text-center text-2xl font-black">{incomingPeer?.full_name || 'Llamada entrante'}</h2>
            <p className="mt-2 text-center text-sm text-slate-400">{incoming.call_type === 'video' ? 'Videollamada' : 'Llamada de voz'}</p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => void finish(incoming.id, 'declined')} className="flex items-center justify-center gap-2 rounded-2xl bg-rose-500/15 px-4 py-3 font-black text-rose-100"><PhoneOff size={18} /> Rechazar</button>
              <button type="button" onClick={() => void accept()} className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 font-black text-slate-950"><Phone size={18} /> Aceptar</button>
            </div>
          </div>
        </div>
      )}
      {active && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/85 p-3 backdrop-blur-md">
          <div className="relative flex min-h-[520px] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl">
            {remoteStream && active.call_type === 'video' ? <video ref={remoteVideo} autoPlay playsInline className="absolute inset-0 size-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center"><div className="text-center text-white"><div className="mx-auto flex size-24 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-200"><Video size={34} /></div><p className="mt-5 text-xl font-black">{activePeer?.full_name || 'Credi Business Chat'}</p><p className="mt-1 text-sm text-slate-400">{active.status === 'active' ? 'Conectado' : 'Conectando…'}</p></div></div>}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/85 to-transparent p-7 pt-16">
              <button type="button" onClick={() => { const tracks = localStream.current?.getAudioTracks() ?? []; const next = !muted; tracks.forEach((track) => { track.enabled = !next }); setMuted(next) }} className="flex size-12 items-center justify-center rounded-full bg-white/10 text-white" aria-label={muted ? 'Activar micrófono' : 'Silenciar micrófono'}>{muted ? <PhoneOff size={19} /> : <Phone size={19} />}</button>
              <button type="button" onClick={() => void finish(active.id, 'ended')} className="flex size-14 items-center justify-center rounded-full bg-rose-500 text-white" aria-label="Finalizar llamada"><PhoneOff size={22} /></button>
            </div>
          </div>
        </div>
      )}
      {error && !active && <div className="fixed bottom-5 right-5 z-[130] max-w-sm rounded-2xl border border-rose-400/20 bg-slate-950 p-4 text-sm text-rose-100 shadow-2xl">{error}<button type="button" className="ml-3 font-black underline" onClick={() => setError(null)}>Cerrar</button></div>}
    </>
  )
}
