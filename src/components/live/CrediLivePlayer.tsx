'use client'

import { useEffect, useRef, useState } from 'react'
import { Radio, WifiOff } from 'lucide-react'

export function CrediLivePlayer({ url, title }: { url: string; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<'connecting' | 'playing' | 'error'>('connecting')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    let peer: RTCPeerConnection | null = null
    let sessionUrl: string | null = null
    const media = new MediaStream()

    async function connect() {
      try {
        const element = videoRef.current
        if (!element) return
        element.srcObject = media
        peer = new RTCPeerConnection()
        peer.addTransceiver('video', { direction: 'recvonly' })
        peer.addTransceiver('audio', { direction: 'recvonly' })
        peer.ontrack = (event) => {
          if (event.track && !media.getTracks().some((track) => track.id === event.track.id)) media.addTrack(event.track)
          void element.play().catch(() => {})
          if (!cancelled) setState('playing')
        }

        const offer = await peer.createOffer()
        await peer.setLocalDescription(offer)
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: offer.sdp,
        })
        if (!response.ok) throw new Error(`La plataforma de vídeo respondió HTTP ${response.status}.`)
        const answer = await response.text()
        if (!answer.trim()) throw new Error('La plataforma no devolvió una respuesta de reproducción.')
        await peer.setRemoteDescription({ type: 'answer', sdp: answer })
        const location = response.headers.get('Location')
        sessionUrl = location ? new URL(location, url).toString() : null
      } catch (cause) {
        if (cancelled) return
        setState('error')
        setError(cause instanceof Error ? cause.message : 'No fue posible conectar con el LIVE.')
      }
    }

    void connect()
    return () => {
      cancelled = true
      peer?.close()
      media.getTracks().forEach((track) => track.stop())
      if (sessionUrl) void fetch(sessionUrl, { method: 'DELETE', keepalive: true }).catch(() => {})
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [url])

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-950">
      <video ref={videoRef} autoPlay playsInline controls className="h-full w-full object-contain" aria-label={title} />
      {state !== 'playing' && (
        <div className="absolute inset-0 grid place-items-center bg-slate-950/90 p-5 text-center text-white">
          <div>
            {state === 'error' ? <WifiOff className="mx-auto size-8 text-rose-300" /> : <Radio className="mx-auto size-8 animate-pulse text-cyan-300" />}
            <p className="mt-2 text-sm font-black">{state === 'error' ? 'No se pudo reproducir el LIVE' : 'Conectando con Credi LIVE…'}</p>
            {error && <p className="mt-2 max-w-sm text-xs text-slate-300">{error}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
