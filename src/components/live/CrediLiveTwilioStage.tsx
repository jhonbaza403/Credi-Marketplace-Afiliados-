'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react'

type TwilioTrack = { attach: (element?: HTMLMediaElement) => HTMLMediaElement; detach: () => HTMLMediaElement[]; kind: string; mediaStreamTrack?: MediaStreamTrack; enable?: () => unknown; disable?: () => unknown; stop?: () => unknown }
type TwilioParticipant = { identity: string; tracks: Map<string, { track?: TwilioTrack }>; on: (event: string, callback: (publication: { track?: TwilioTrack }) => void) => void }
type TwilioRoom = { localParticipant: { identity: string; tracks: Map<string, { track?: TwilioTrack }> }; participants: Map<string, TwilioParticipant>; on: (event: string, callback: (participant: TwilioParticipant, publication?: { track?: TwilioTrack }) => void) => void; disconnect: () => void }
type TwilioVideoSdk = { connect: (token: string, options: { name: string; tracks: TwilioTrack[] }) => Promise<TwilioRoom>; createLocalTracks: (options: { audio: boolean; video: { width: number; height: number } }) => Promise<TwilioTrack[]> }

declare global {
  interface Window { Twilio?: { Video?: TwilioVideoSdk } }
}

const SDK_URL = 'https://sdk.twilio.com/js/video/releases/2.31.1/twilio-video.min.js'

function loadSdk() {
  if (window.Twilio?.Video) return Promise.resolve(window.Twilio.Video)
  return new Promise<TwilioVideoSdk>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`)
    const script = existing ?? document.createElement('script')
    const failed = () => reject(new Error('No fue posible cargar el SDK de Twilio Video. Comprueba la política CSP y la conexión.'))
    script.addEventListener('error', failed, { once: true })
    script.addEventListener('load', () => window.Twilio?.Video ? resolve(window.Twilio.Video) : failed(), { once: true })
    if (!existing) { script.src = SDK_URL; script.async = true; document.head.appendChild(script) }
  })
}

function attachTrack(track: TwilioTrack, container: HTMLElement | null) {
  if (!container) return
  const element = track.attach()
  if (track.kind === 'video') {
    element.setAttribute('playsinline', 'true')
    element.className = 'h-full w-full rounded-xl object-cover'
  } else {
    element.style.display = 'none'
  }
  container.appendChild(element)
}

export function CrediLiveTwilioStage({ roomId, active, broadcastUrl }: { roomId: string; active: boolean; broadcastUrl?: string | null }) {
  const roomRef = useRef<TwilioRoom | null>(null)
  const localRef = useRef<HTMLDivElement>(null)
  const remoteRef = useRef<HTMLDivElement>(null)
  const tracksRef = useRef<TwilioTrack[]>([])
  const remoteTracksRef = useRef<TwilioTrack[]>([])
  const broadcastPcRef = useRef<RTCPeerConnection | null>(null)
  const broadcastAudioRef = useRef<AudioContext | null>(null)
  const broadcastStreamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const [broadcasting, setBroadcasting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [busy, setBusy] = useState(false)
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [message, setMessage] = useState('Twilio Video permite invitados interactivos; Cloudflare Stream sigue siendo la distribución principal de LIVE.')

  useEffect(() => () => {
    roomRef.current?.disconnect()
    roomRef.current = null
    stopBroadcast()
    tracksRef.current.forEach((track) => track.stop?.())
  }, [roomId])

  function attachRemoteTrack(track: TwilioTrack) {
    attachTrack(track, remoteRef.current)
    if (track.kind === 'audio' && track.mediaStreamTrack && !remoteTracksRef.current.some((item) => item.mediaStreamTrack?.id === track.mediaStreamTrack?.id)) {
      remoteTracksRef.current.push(track)
    }
  }

  function stopBroadcast() {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current)
    animationFrameRef.current = null
    broadcastPcRef.current?.close()
    broadcastPcRef.current = null
    broadcastStreamRef.current?.getTracks().forEach((track) => track.stop())
    broadcastStreamRef.current = null
    void broadcastAudioRef.current?.close().catch(() => undefined)
    broadcastAudioRef.current = null
    setBroadcasting(false)
  }

  async function startBroadcast() {
    if (!broadcastUrl || broadcasting) return
    setMessage('Preparando la mezcla de vídeo y audio para Cloudflare Stream…')
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1280
      canvas.height = 720
      const context = canvas.getContext('2d')
      if (!context || typeof canvas.captureStream !== 'function') throw new Error('Este navegador no permite componer la emisión LIVE.')
      const draw = () => {
        context.fillStyle = '#020617'
        context.fillRect(0, 0, canvas.width, canvas.height)
        const videos = [localRef.current?.querySelector('video') ?? null, ...Array.from(remoteRef.current?.querySelectorAll('video') ?? [])]
          .filter((video): video is HTMLVideoElement => Boolean(video && video.readyState >= 2 && video.videoWidth > 0))
        const columns = Math.max(1, Math.ceil(Math.sqrt(videos.length)))
        const rows = Math.max(1, Math.ceil(videos.length / columns))
        videos.forEach((video, index) => {
          const width = canvas.width / columns
          const height = canvas.height / rows
          const x = (index % columns) * width
          const y = Math.floor(index / columns) * height
          try { context.drawImage(video, x, y, width, height) } catch { /* wait for next frame */ }
        })
        animationFrameRef.current = requestAnimationFrame(draw)
      }
      draw()
      const canvasStream = canvas.captureStream(30)
      const audioContext = new AudioContext()
      broadcastAudioRef.current = audioContext
      const mixedAudio = audioContext.createMediaStreamDestination()
      const allAudioTracks = [...tracksRef.current, ...remoteTracksRef.current]
        .filter((track) => track.kind === 'audio' && track.mediaStreamTrack)
      const seen = new Set<string>()
      allAudioTracks.forEach((track) => {
        const mediaTrack = track.mediaStreamTrack
        if (!mediaTrack || seen.has(mediaTrack.id)) return
        seen.add(mediaTrack.id)
        audioContext.createMediaStreamSource(new MediaStream([mediaTrack])).connect(mixedAudio)
      })
      const outgoing = new MediaStream([...canvasStream.getVideoTracks(), ...mixedAudio.stream.getAudioTracks()])
      broadcastStreamRef.current = outgoing
      const pc = new RTCPeerConnection()
      broadcastPcRef.current = pc
      outgoing.getTracks().forEach((track) => pc.addTrack(track, outgoing))
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      if (pc.iceGatheringState !== 'complete') {
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => reject(new Error('La preparación ICE de la emisión agotó el tiempo de espera.')), 12000)
          pc.addEventListener('icegatheringstatechange', () => {
            if (pc.iceGatheringState === 'complete') { window.clearTimeout(timeout); resolve() }
          })
        })
      }
      const response = await fetch(broadcastUrl, { method: 'POST', headers: { 'Content-Type': 'application/sdp' }, body: pc.localDescription?.sdp ?? '' })
      const answer = await response.text()
      if (!response.ok || !answer.trim()) throw new Error('Cloudflare Stream rechazó la negociación WebRTC. Comprueba que el transporte esté provisionado y habilitado.')
      await pc.setRemoteDescription({ type: 'answer', sdp: answer })
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') { setBroadcasting(true); setMessage('Emisión conectada: el escenario Twilio se está enviando a Cloudflare Stream.') }
        if (['failed', 'disconnected', 'closed'].includes(pc.connectionState) && broadcasting) setMessage('La conexión de emisión se interrumpió. Puedes detenerla e intentarlo de nuevo.')
      }
      setMessage('Negociación de emisión enviada a Cloudflare Stream; esperando confirmar conexión…')
    } catch (error) {
      stopBroadcast()
      setMessage(error instanceof Error ? error.message : 'No fue posible emitir el escenario a Cloudflare Stream.')
    }
  }

  async function connect() {
    if (busy || connected) return
    setBusy(true)
    setMessage('')
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('El navegador no ofrece acceso a cámara y micrófono. Usa HTTPS y concede permisos.')
      const response = await fetch('/api/live/twilio-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
        cache: 'no-store',
      })
      const data = await response.json().catch(() => ({})) as { token?: string; roomName?: string; error?: string }
      if (!response.ok || !data.token || !data.roomName) throw new Error(data.error || 'No fue posible preparar el escenario Twilio.')
      const sdk = await loadSdk()
      const localTracks = await sdk.createLocalTracks({ audio: true, video: { width: 1280, height: 720 } })
      tracksRef.current = localTracks
      const room = await sdk.connect(data.token, { name: data.roomName, tracks: localTracks })
      roomRef.current = room
      room.participants.forEach((participant) => {
        participant.tracks.forEach((publication) => { if (publication.track) attachRemoteTrack(publication.track) })
        participant.on('trackSubscribed', (publication) => { if (publication.track) attachRemoteTrack(publication.track) })
      })
      room.on('participantConnected', (participant) => {
        participant.tracks.forEach((publication) => { if (publication.track) attachTrack(publication.track, remoteRef.current) })
        participant.on('trackSubscribed', (publication) => { if (publication.track) attachTrack(publication.track, remoteRef.current) })
      })
      room.on('participantDisconnected', () => setMessage('Un invitado salió del escenario.'))
      setConnected(true)
      setMessage('Conectado a Twilio Video. El vídeo interactivo funciona aparte de la emisión pública Cloudflare.')
      const localVideo = document.createElement('video')
      localVideo.autoplay = true
      localVideo.muted = true
      localVideo.playsInline = true
      localVideo.className = 'h-full w-full rounded-xl object-cover'
      const localVideoTrack = localTracks.find((track) => track.kind === 'video')
      if (localVideoTrack) localVideoTrack.attach(localVideo)
      localRef.current?.replaceChildren(localVideo)
    } catch (error) {
      tracksRef.current.forEach((track) => track.stop?.())
      tracksRef.current = []
      roomRef.current?.disconnect()
      roomRef.current = null
      setMessage(error instanceof Error ? error.message : 'No fue posible conectar Twilio Video.')
    } finally {
      setBusy(false)
    }
  }

  function disconnect() {
    stopBroadcast()
    roomRef.current?.disconnect()
    roomRef.current = null
    tracksRef.current.forEach((track) => track.stop?.())
    tracksRef.current = []
    remoteTracksRef.current = []
    localRef.current?.replaceChildren()
    remoteRef.current?.replaceChildren()
    setConnected(false)
    setMuted(false)
    setCameraOff(false)
    setMessage('Desconectado del escenario Twilio.')
  }

  async function toggleMute() {
    const audio = tracksRef.current.filter((track) => track.kind === 'audio')
    const next = !muted
    audio.forEach((track) => { if (next) track.disable?.(); else track.enable?.() })
    setMuted(next)
  }

  function toggleCamera() {
    const video = tracksRef.current.filter((track) => track.kind === 'video')
    const next = !cameraOff
    video.forEach((track) => { if (next) track.disable?.(); else track.enable?.() })
    setCameraOff(next)
  }

  return <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-black uppercase tracking-wider text-[var(--primary)]">Escenario interactivo · Twilio Video</p><p className="mt-1 text-xs text-[var(--muted)]">Invitados autorizados pueden compartir cámara y audio en una sala privada de vídeo.</p></div>
      <span className={connected ? 'rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700' : 'rounded-full bg-[var(--surface-secondary)] px-3 py-1 text-xs font-bold'}>{connected ? 'Conectado' : 'Desconectado'}</span>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div><p className="mb-1 text-xs font-bold">Tu cámara</p><div ref={localRef} className="aspect-video overflow-hidden rounded-xl bg-slate-950" /></div>
      <div><p className="mb-1 text-xs font-bold">Invitados</p><div ref={remoteRef} className="flex aspect-video flex-wrap gap-1 overflow-auto rounded-xl bg-slate-950 p-1" /></div>
    </div>
    <p role="status" className="mt-3 text-xs leading-5 text-[var(--muted)]">{message}</p>
    <div className="mt-3 flex flex-wrap gap-2">
      {!connected ? <button type="button" disabled={busy || !active} onClick={() => void connect()} className="rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-black text-white disabled:opacity-50">{busy ? 'Conectando…' : 'Entrar al escenario'}</button> : <>
        <button type="button" onClick={() => void toggleMute()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold">{muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}{muted ? 'Activar micrófono' : 'Silenciar'}</button>
        <button type="button" onClick={toggleCamera} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold">{cameraOff ? <VideoOff className="size-4" /> : <Video className="size-4" />}{cameraOff ? 'Activar cámara' : 'Apagar cámara'}</button>
        {broadcasting ? <button type="button" onClick={stopBroadcast} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white">Detener emisión pública</button> : <button type="button" disabled={!broadcastUrl} onClick={() => void startBroadcast()} className="rounded-xl bg-cyan-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{broadcastUrl ? 'Emitir escenario a Credi LIVE' : 'Provisiona Cloudflare para emitir'}</button>}
        <button type="button" onClick={disconnect} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white"><PhoneOff className="size-4" />Salir del escenario</button>
      </>}
    </div>
    {!active && <p className="mt-2 text-xs text-amber-700">Inicia o programa la sala LIVE antes de entrar al escenario.</p>}
  </section>
}
