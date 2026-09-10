'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type IceServer = RTCIceServer

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

const TURN_ENDPOINT = '/api/chat/turn'
const TURN_CACHE_MS = 45 * 60 * 1000

let cachedIceServers: IceServer[] | null = null
let cachedIceServersAt = 0
let turnRequest: Promise<IceServer[]> | null = null

async function getIceServers(): Promise<IceServer[]> {
  if (cachedIceServers && Date.now() - cachedIceServersAt < TURN_CACHE_MS) return cachedIceServers
  if (turnRequest) return turnRequest

  turnRequest = fetch(TURN_ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
    .then(async (response) => {
      const payload = await response.json().catch(() => ({})) as { iceServers?: IceServer[]; error?: string }
      if (!response.ok || !Array.isArray(payload.iceServers) || payload.iceServers.length === 0) {
        throw new Error(payload.error || 'No fue posible obtener los servidores de llamada.')
      }
      cachedIceServers = payload.iceServers
      cachedIceServersAt = Date.now()
      return payload.iceServers
    })
    .finally(() => {
      turnRequest = null
    })

  return turnRequest
}

function signalDescription(type: string) {
  if (type === 'offer') return 'Llamada entrante'
  if (type === 'answer') return 'Conectando…'
  if (type === 'ice') return 'Conectando…'
  return 'Llamada'
}

export default function CrediBusinessCallTurn({
  conversationId,
  currentUserId,
  peerUserId,
  peerName,
}: {
  conversationId: string | null
  currentUserId: string | null
  peerUserId: string | null
  peerName: string
}) {
  const supabase = useRef(createClient()).current
  const pc = useRef<RTCPeerConnection | null>(null)
  const localStream = useRef<MediaStream | null>(null)
  const remoteAudio = useRef<HTMLAudioElement | null>(null)
  const activeCallId = useRef<string | null>(null)
  const peerRef = useRef<string | null>(null)
  const [call, setCall] = useState<CallRow | null>(null)
  const [incoming, setIncoming] = useState<CallRow | null>(null)
  const [callError, setCallError] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  const stopMedia = useCallback(() => {
    localStream.current?.getTracks().forEach((track) => track.stop())
    localStream.current = null
    pc.current?.close()
    pc.current = null
    setRemoteStream(null)
    setMuted(false)
    setCameraOff(false)
  }, [])

  const finishCall = useCallback(async (callId: string | null, status: CallRow['status'] = 'ended') => {
    if (callId) {
      await supabase.from('chat_calls').update({ status, ended_at: new Date().toISOString() }).eq('id', callId)
      if (currentUserId) {
        await supabase.from('chat_call_participants').update({
          state: status === 'declined' ? 'declined' : 'left',
          left_at: new Date().toISOString(),
        }).eq('call_id', callId).eq('user_id', currentUserId)
        if (peerRef.current) {
          await supabase.from('chat_call_signals').insert({
            call_id: callId,
            sender_id: currentUserId,
            recipient_id: peerRef.current,
            signal_type: 'hangup',
            payload: {},
          })
        }
      }
    }
    activeCallId.current = null
    setCall(null)
    setIncoming(null)
    stopMedia()
  }, [currentUserId, stopMedia, supabase])

  const sendSignal = useCallback(async (
    callId: string,
    recipientId: string,
    signalType: SignalRow['signal_type'],
    payload: Record<string, unknown>,
  ) => {
    if (!currentUserId) return
    const { error } = await supabase.from('chat_call_signals').insert({
      call_id: callId,
      sender_id: currentUserId,
      recipient_id: recipientId,
      signal_type: signalType,
      payload,
    })
    if (error) throw error
  }, [currentUserId, supabase])

  const preparePeer = useCallback(async (callRow: CallRow, remoteUserId: string, offerer: boolean) => {
    const media = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callRow.call_type === 'video',
    })

    const iceServers = await getIceServers()
    localStream.current = media
    peerRef.current = remoteUserId

    const connection = new RTCPeerConnection({
      iceServers,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    })

    pc.current = connection
    media.getTracks().forEach((track) => connection.addTrack(track, media))

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        void sendSignal(callRow.id, remoteUserId, 'ice', {
          candidate: event.candidate.toJSON(),
        }).catch(() => undefined)
      }
    }

    connection.oniceconnectionstatechange = () => {
      if (connection.iceConnectionState === 'failed') {
        setCallError('La red no pudo establecer el canal de llamada. Comprueba la conexión a Internet e inténtalo de nuevo.')
      }
    }

    connection.ontrack = (event) => {
      const stream = event.streams[0]
      if (stream) {
        setRemoteStream(stream)
        if (remoteAudio.current) remoteAudio.current.srcObject = stream
      }
    }

    connection.onconnectionstatechange = () => {
      if (connection.connectionState === 'connected') {
        setCall((current) => current ? { ...current, status: 'active' } : current)
        void supabase.from('chat_calls').update({
          status: 'active',
          started_at: new Date().toISOString(),
        }).eq('id', callRow.id)
      }
      if (['failed', 'closed'].includes(connection.connectionState)) {
        setCallError('La conexión de la llamada se perdió.')
      }
    }

    if (offerer) {
      const offer = await connection.createOffer()
      await connection.setLocalDescription(offer)
      await sendSignal(callRow.id, remoteUserId, 'offer', {
        description: offer,
      })
    }

    return media
  }, [sendSignal, supabase])

  const startCall = useCallback(async (type: 'audio' | 'video') => {
    if (!conversationId || !currentUserId || !peerUserId || call) return
    setCallError(null)

    try {
      const { data, error } = await supabase.from('chat_calls').insert({
        conversation_id: conversationId,
        initiated_by: currentUserId,
        call_type: type,
        status: 'ringing',
      }).select('id,conversation_id,initiated_by,call_type,status').single()

      if (error || !data) throw error ?? new Error('No fue posible iniciar la llamada.')

      const callRow = data as CallRow
      const { error: participantError } = await supabase.from('chat_call_participants').insert([
        { call_id: callRow.id, user_id: currentUserId, role: 'initiator', state: 'ringing' },
        { call_id: callRow.id, user_id: peerUserId, role: 'participant', state: 'invited' },
      ])
      if (participantError) throw participantError

      activeCallId.current = callRow.id
      setCall(callRow)
      await preparePeer(callRow, peerUserId, true)
      await supabase.from('chat_calls').update({ status: 'connecting' }).eq('id', callRow.id)
      setCall((current) => current ? { ...current, status: 'connecting' } : current)
    } catch (error) {
      stopMedia()
      setCall(null)
      setCallError(error instanceof Error ? error.message : 'No fue posible iniciar la llamada. Verifica cámara y micrófono.')
    }
  }, [call, conversationId, currentUserId, peerUserId, preparePeer, stopMedia, supabase])

  const acceptCall = useCallback(async (incomingCall: CallRow) => {
    if (!currentUserId) return
    setCallError(null)

    try {
      const { data: signal, error: signalError } = await supabase
        .from('chat_call_signals')
        .select('id,call_id,sender_id,recipient_id,signal_type,payload')
        .eq('call_id', incomingCall.id)
        .eq('recipient_id', currentUserId)
        .eq('signal_type', 'offer')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (signalError || !signal) throw signalError ?? new Error('La invitación de llamada ya no está disponible.')

      activeCallId.current = incomingCall.id
      setIncoming(null)
      setCall({ ...incomingCall, status: 'connecting' })
      peerRef.current = signal.sender_id

      await supabase.from('chat_call_participants').update({
        state: 'accepted',
        joined_at: new Date().toISOString(),
      }).eq('call_id', incomingCall.id).eq('user_id', currentUserId)

      await preparePeer(incomingCall, signal.sender_id, false)

      const description = signal.payload.description as RTCSessionDescriptionInit
      await pc.current?.setRemoteDescription(description)
      const answer = await pc.current?.createAnswer()
      if (!answer) throw new Error('No fue posible crear la respuesta de llamada.')
      await pc.current?.setLocalDescription(answer)
      await sendSignal(incomingCall.id, signal.sender_id, 'answer', { description: answer })
      await supabase.from('chat_calls').update({ status: 'connecting' }).eq('id', incomingCall.id)
    } catch (error) {
      setCallError(error instanceof Error ? error.message : 'No fue posible aceptar la llamada.')
      await finishCall(incomingCall.id, 'failed')
    }
  }, [currentUserId, finishCall, preparePeer, sendSignal, supabase])

  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel(`credibusiness-calls:${currentUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_calls' }, (payload) => {
        const next = payload.new as CallRow
        if (next.initiated_by === currentUserId || next.status !== 'ringing') return
        setIncoming((current) => current ?? next)
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_call_signals',
        filter: `recipient_id=eq.${currentUserId}`,
      }, async (payload) => {
        const signal = payload.new as SignalRow
        if (!activeCallId.current || signal.call_id !== activeCallId.current) return

        try {
          if (signal.signal_type === 'answer') {
            const description = signal.payload.description as RTCSessionDescriptionInit
            await pc.current?.setRemoteDescription(description)
            return
          }
          if (signal.signal_type === 'ice') {
            const candidate = signal.payload.candidate as RTCIceCandidateInit
            await pc.current?.addIceCandidate(candidate)
            return
          }
          if (signal.signal_type === 'hangup') {
            setCallError('La otra persona finalizó la llamada.')
            void finishCall(activeCallId.current, 'ended')
          }
        } catch {
          setCallError(`No fue posible procesar la señal de ${signalDescription(signal.signal_type).toLowerCase()}.`)
        }
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [currentUserId, finishCall, supabase])

  useEffect(() => {
    const conversation = conversationId
    const user = currentUserId
    if (!conversation || !user) return

    const channel = supabase
      .channel(`credibusiness-call-monitor:${conversation}:${user}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_calls',
        filter: `conversation_id=eq.${conversation}`,
      }, (payload) => {
        const next = payload.new as CallRow
        if (next.initiated_by !== user && next.status === 'ringing') {
          setIncoming((current) => current ?? next)
        }
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [conversationId, currentUserId, supabase])

  if (callError || incoming || call) {
    return (
      <>
        <audio ref={remoteAudio} autoPlay />
        {incoming && !call && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-200"><Phone size={28} /></div>
              <p className="mt-4 text-center text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Credi Business Chat</p>
              <h2 className="mt-2 text-center text-2xl font-black">{peerName} te está llamando</h2>
              <p className="mt-2 text-center text-sm text-slate-400">Llamada {incoming.call_type === 'video' ? 'de vídeo' : 'de voz'}</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => void finishCall(incoming.id, 'declined')} className="flex items-center justify-center gap-2 rounded-2xl bg-rose-500/15 px-4 py-3 font-black text-rose-100"><PhoneOff size={18} /> Rechazar</button>
                <button type="button" onClick={() => void acceptCall(incoming)} className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 font-black text-slate-950"><Phone size={18} /> Aceptar</button>
              </div>
            </div>
          </div>
        )}
        {call && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md">
            <div className="relative flex min-h-[520px] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl">
              {remoteStream ? <video autoPlay playsInline ref={(node) => { if (node) node.srcObject = remoteStream }} className="absolute inset-0 size-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center bg-slate-950"><div className="text-center"><div className="mx-auto flex size-20 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-200"><Phone size={30} /></div><p className="mt-4 font-black">{call.status === 'active' ? peerName : 'Llamando…'}</p><p className="mt-1 text-sm text-slate-400">{call.status === 'active' ? 'Conectado' : 'Esperando respuesta'}</p></div></div>}
              {call.call_type === 'video' && localStream.current && <video autoPlay muted playsInline ref={(node) => { if (node && localStream.current) node.srcObject = localStream.current }} className="absolute right-4 top-4 h-32 w-24 rounded-2xl border border-white/20 object-cover shadow-xl sm:h-44 sm:w-32" />}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/80 to-transparent p-6 pt-14">
                <button type="button" onClick={() => { const tracks = localStream.current?.getAudioTracks() ?? []; const next = !muted; tracks.forEach((track) => { track.enabled = !next }); setMuted(next) }} className="flex size-12 items-center justify-center rounded-full bg-white/10 text-white" aria-label={muted ? 'Activar micrófono' : 'Silenciar micrófono'}>{muted ? <MicOff size={19} /> : <Mic size={19} />}</button>
                {call.call_type === 'video' && <button type="button" onClick={() => { const tracks = localStream.current?.getVideoTracks() ?? []; const next = !cameraOff; tracks.forEach((track) => { track.enabled = !next }); setCameraOff(next) }} className="flex size-12 items-center justify-center rounded-full bg-white/10 text-white" aria-label={cameraOff ? 'Activar cámara' : 'Apagar cámara'}>{cameraOff ? <VideoOff size={19} /> : <Video size={19} />}</button>}
                <button type="button" onClick={() => void finishCall(call.id, 'ended')} className="flex size-14 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg" aria-label="Finalizar llamada"><PhoneOff size={22} /></button>
              </div>
            </div>
          </div>
        )}
        {callError && !call && <div className="fixed bottom-5 right-5 z-[100] max-w-sm rounded-2xl border border-rose-400/20 bg-slate-950 p-4 text-sm text-rose-100 shadow-2xl">{callError}<button type="button" className="ml-3 font-black underline" onClick={() => setCallError(null)}>Cerrar</button></div>}
      </>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => void startCall('audio')} disabled={!conversationId || !currentUserId || !peerUserId} className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-slate-200 transition hover:bg-white/[.08] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Llamada de voz"><Phone size={18} /></button>
      <button type="button" onClick={() => void startCall('video')} disabled={!conversationId || !currentUserId || !peerUserId} className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-slate-200 transition hover:bg-white/[.08] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Videollamada"><Video size={18} /></button>
    </div>
  )
}
