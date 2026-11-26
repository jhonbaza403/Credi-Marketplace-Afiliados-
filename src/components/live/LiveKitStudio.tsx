'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type LiveKitTrack = { attach: () => HTMLMediaElement; detach: () => HTMLMediaElement[] }
type LiveKitPublication = { track?: LiveKitTrack | null }
type LiveKitParticipant = {
  videoTrackPublications: Map<string, LiveKitPublication>
  audioTrackPublications: Map<string, LiveKitPublication>
  setCameraEnabled: (enabled: boolean) => Promise<void>
  setMicrophoneEnabled: (enabled: boolean) => Promise<void>
}
type LiveKitRoom = {
  localParticipant: LiveKitParticipant
  remoteParticipants: Map<string, LiveKitParticipant>
  connect: (url: string, token: string) => Promise<void>
  disconnect: () => Promise<void>
  on: (event: string, callback: () => void) => void
  off: (event: string, callback: () => void) => void
}
type LiveKitNamespace = { Room: new (options: Record<string, unknown>) => LiveKitRoom; RoomEvent: Record<string, string> }
declare global { interface Window { LivekitClient?: LiveKitNamespace } }

const SDK_URL = 'https://cdn.jsdelivr.net/npm/livekit-client@2.23.0/dist/livekit-client.umd.min.js'

export function LiveKitStudio({ roomId }: { roomId: string }) {
  const [sdkReady, setSdkReady] = useState(false)
  const [connected, setConnected] = useState(false)
  const [role, setRole] = useState<'host' | 'viewer' | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [participantCount, setParticipantCount] = useState(0)
  const [broadcasting, setBroadcasting] = useState(false)
  const roomRef = useRef<LiveKitRoom | null>(null)
  const mediaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.LivekitClient) { setSdkReady(true); return }
    const existing = document.querySelector<HTMLScriptElement>('script[data-credi-livekit]')
    if (existing) {
      existing.addEventListener('load', () => setSdkReady(Boolean(window.LivekitClient)), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = SDK_URL
    script.async = true
    script.dataset.crediLivekit = 'true'
    script.onload = () => setSdkReady(Boolean(window.LivekitClient))
    script.onerror = () => setMessage('No se pudo cargar el SDK de LiveKit.')
    document.head.appendChild(script)
  }, [])

  const renderTracks = useCallback(() => {
    const root = mediaRef.current
    const room = roomRef.current
    if (!root || !room) return
    const participants = [room.localParticipant, ...room.remoteParticipants.values()]
    for (const participant of participants) {
      for (const publication of participant.videoTrackPublications.values()) publication.track?.detach()
      for (const publication of participant.audioTrackPublications.values()) publication.track?.detach()
    }
    root.replaceChildren()
    for (const participant of participants) {
      for (const publication of participant.videoTrackPublications.values()) {
        if (!publication.track) continue
        const element = publication.track.attach()
        element.className = 'h-full min-h-40 w-full rounded-xl bg-black object-cover'
        root.appendChild(element)
      }
    }
    for (const participant of room.remoteParticipants.values()) {
      for (const publication of participant.audioTrackPublications.values()) {
        if (!publication.track) continue
        const element = publication.track.attach()
        element.autoplay = true
        element.className = 'sr-only'
        root.appendChild(element)
      }
    }
    setParticipantCount(participants.length)
  }, [])

  const disconnect = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    if (role === 'host' && broadcasting) {
      await fetch('/api/live/egress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId, action: 'stop' }) }).catch(() => null)
    }
    await room.disconnect().catch(() => null)
    roomRef.current = null
    setConnected(false); setBroadcasting(false); setRole(null); setParticipantCount(0)
    mediaRef.current?.replaceChildren()
  }, [broadcasting, role, roomId])

  useEffect(() => () => { void roomRef.current?.disconnect() }, [])

  async function connect() {
    if (!sdkReady || !window.LivekitClient) return
    setBusy(true); setMessage('')
    try {
      const tokenResponse = await fetch('/api/live/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId }) })
      const credentials = await tokenResponse.json().catch(() => ({})) as { server_url?: string; participant_token?: string; role?: 'host' | 'viewer'; error?: string }
      if (!tokenResponse.ok || !credentials.server_url || !credentials.participant_token || !credentials.role) throw new Error(credentials.error || 'No fue posible obtener el acceso LiveKit.')
      const room = new window.LivekitClient.Room({ adaptiveStream: true, dynacast: true })
      const events = window.LivekitClient.RoomEvent
      room.on(events.TrackSubscribed || 'trackSubscribed', renderTracks)
      room.on(events.TrackUnsubscribed || 'trackUnsubscribed', renderTracks)
      room.on(events.LocalTrackPublished || 'localTrackPublished', renderTracks)
      room.on(events.LocalTrackUnpublished || 'localTrackUnpublished', renderTracks)
      room.on(events.Disconnected || 'disconnected', () => { setConnected(false); setBroadcasting(false); setParticipantCount(0); mediaRef.current?.replaceChildren() })
      room.on(events.ParticipantConnected || 'participantConnected', renderTracks)
      room.on(events.ParticipantDisconnected || 'participantDisconnected', renderTracks)
      roomRef.current = room
      await room.connect(credentials.server_url, credentials.participant_token)
      setRole(credentials.role); setConnected(true); setMessage(credentials.role === 'host' ? 'Estudio WebRTC conectado. Activa cámara y micrófono para iniciar la emisión.' : 'Conectado al escenario LIVE.')
      renderTracks()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible conectar con LiveKit.')
      await roomRef.current?.disconnect().catch(() => null)
      roomRef.current = null
    } finally { setBusy(false) }
  }

  async function startBroadcast() {
    const room = roomRef.current
    if (!room || role !== 'host') return
    setBusy(true); setMessage('')
    try {
      await room.localParticipant.setCameraEnabled(true)
      await room.localParticipant.setMicrophoneEnabled(true)
      renderTracks()
      const response = await fetch('/api/live/egress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId, action: 'start' }) })
      const result = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(result.error || 'No fue posible conectar la emisión con Cloudflare Stream.')
      setBroadcasting(true)
      setMessage('WebRTC activo y distribución hacia Cloudflare Stream solicitada.')
    } catch (error) {
      await room.localParticipant.setCameraEnabled(false).catch(() => null)
      await room.localParticipant.setMicrophoneEnabled(false).catch(() => null)
      renderTracks()
      setMessage(error instanceof Error ? error.message : 'No fue posible iniciar la emisión.')
    } finally { setBusy(false) }
  }

  async function stopBroadcast() {
    const room = roomRef.current
    setBusy(true)
    try {
      const response = await fetch('/api/live/egress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId, action: 'stop' }) })
      if (!response.ok) throw new Error('No se pudo detener la distribución Cloudflare.')
      await room?.localParticipant.setCameraEnabled(false)
      await room?.localParticipant.setMicrophoneEnabled(false)
      setBroadcasting(false); setMessage('Distribución detenida. La sala WebRTC sigue conectada.')
      renderTracks()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible detener la distribución.')
    } finally { setBusy(false) }
  }

  return <section className="mt-6 rounded-2xl border border-violet-500/20 bg-violet-500/[.04] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[10px] font-black uppercase tracking-[.14em] text-violet-700">LiveKit WebRTC</p><h3 className="mt-1 font-black">Estudio interactivo Credi</h3><p className="mt-1 text-xs text-[var(--muted)]">Audio/video de baja latencia y distribución mediante Cloudflare Stream</p></div>
      <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-700">{connected ? (broadcasting ? 'Distribución iniciada' : 'Conectado') : sdkReady ? 'Listo' : 'Cargando SDK'}</span>
    </div>
    <div ref={mediaRef} className="mt-4 grid min-h-32 grid-cols-1 gap-2 sm:grid-cols-2" aria-live="polite" />
    <p className="mt-2 text-xs text-[var(--muted)]">Participantes conectados: {participantCount}</p>
    {message && <p role="status" className="mt-3 rounded-lg bg-[var(--surface)] p-3 text-xs">{message}</p>}
    <div className="mt-4 flex flex-wrap gap-2">
      {!connected ? <button type="button" onClick={() => void connect()} disabled={!sdkReady || busy} className="rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{busy ? 'Conectando…' : 'Conectar estudio'}</button> : <>
        {role === 'host' && !broadcasting && <button type="button" onClick={() => void startBroadcast()} disabled={busy} className="rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{busy ? 'Iniciando…' : 'Iniciar emisión'}</button>}
        {role === 'host' && broadcasting && <button type="button" onClick={() => void stopBroadcast()} disabled={busy} className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">Detener emisión</button>}
        <button type="button" onClick={() => void disconnect()} disabled={busy} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-xs font-bold">Salir de la sala</button>
      </>}
    </div>
  </section>
}
