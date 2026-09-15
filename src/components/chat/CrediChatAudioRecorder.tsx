'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Square, Trash2, Send, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uploadCrediChatAudio } from '@/lib/storage/credichat-audio'

const MAX_RECORDING_MS = 120_000

function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60).toString().padStart(2, '0')
  const seconds = (total % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

function preferredMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

type Props = {
  conversationId: string | null
  userId: string | null
  disabled?: boolean
  onSent?: () => void
}

export default function CrediChatAudioRecorder({ conversationId, userId, disabled = false, onSent }: Props) {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const startedAtRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearPreview = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setAudioBlob(null)
    setElapsed(0)
  }, [previewUrl])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }, [])

  useEffect(() => () => {
    stopStream()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl, stopStream])

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    recorder.stop()
    stopStream()
    setRecording(false)
  }, [stopStream])

  const startRecording = async () => {
    if (disabled || sending || recording || !conversationId || !userId) return
    setError(null)
    clearPreview()
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Este navegador no permite grabar audio. Usa una versión actualizada de Chrome, Edge, Safari o Firefox.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      const mimeType = preferredMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      streamRef.current = stream
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      startedAtRef.current = Date.now()
      setElapsed(0)
      setRecording(true)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onerror = () => {
        setError('La grabación de audio encontró un error.')
        setRecording(false)
        stopStream()
      }
      recorder.onstop = () => {
        const duration = Math.min(MAX_RECORDING_MS, Date.now() - startedAtRef.current)
        const type = recorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        if (blob.size > 0) {
          setAudioBlob(blob)
          setPreviewUrl(URL.createObjectURL(blob))
          setElapsed(duration)
        } else {
          setError('No se capturó ningún audio.')
        }
        mediaRecorderRef.current = null
      }
      recorder.start(250)
      timerRef.current = setInterval(() => {
        const next = Date.now() - startedAtRef.current
        setElapsed(Math.min(next, MAX_RECORDING_MS))
        if (next >= MAX_RECORDING_MS) stopRecording()
      }, 200)
    } catch (cause) {
      stopStream()
      const name = cause instanceof DOMException ? cause.name : ''
      setError(name === 'NotAllowedError' ? 'Permiso de micrófono denegado. Actívalo para grabar mensajes de voz.' : 'No fue posible acceder al micrófono.')
    }
  }

  const sendRecording = async () => {
    if (!audioBlob || !conversationId || !userId || sending) return
    setSending(true)
    setError(null)
    try {
      const extension = audioBlob.type.includes('ogg') ? 'ogg' : audioBlob.type.includes('mp4') ? 'm4a' : 'webm'
      const file = new File([audioBlob], `voice-${Date.now()}.${extension}`, { type: audioBlob.type || 'audio/webm' })
      const media = await uploadCrediChatAudio(file)
      const supabase = createClient()
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          message_type: 'audio',
          metadata: {
            bucket: media.bucket,
            storage_path: media.path,
            file_name: media.name,
            mime_type: media.contentType,
            size_bytes: media.size,
            duration_ms: elapsed,
          },
        })
        .select('id')
        .single()
      if (messageError || !message) throw messageError ?? new Error('No fue posible crear el mensaje de audio.')

      const { error: attachmentError } = await supabase.from('message_attachments').insert({
        message_id: message.id,
        storage_path: media.path,
        file_name: media.name,
        mime_type: media.contentType,
        size_bytes: media.size,
        duration_ms: elapsed,
      })
      if (attachmentError) throw attachmentError

      clearPreview()
      onSent?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible enviar el audio.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      {error && <span role="alert" className="sr-only">{error}</span>}
      {!recording && !audioBlob && (
        <button type="button" onClick={() => void startRecording()} disabled={disabled || sending || !conversationId || !userId} aria-label="Grabar mensaje de voz" title="Grabar mensaje de voz" className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-cyan-200 transition hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-40">
          <Mic size={19} />
        </button>
      )}

      {recording && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-300/20 bg-rose-300/10 px-2">
          <span className="size-2 animate-pulse rounded-full bg-rose-300" aria-hidden="true" />
          <span className="min-w-12 text-center font-mono text-xs text-rose-100">{formatDuration(elapsed)}</span>
          <button type="button" onClick={stopRecording} aria-label="Detener grabación" title="Detener grabación" className="flex size-9 items-center justify-center rounded-lg text-rose-100 hover:bg-rose-300/10"><Square size={16} fill="currentColor" /></button>
        </div>
      )}

      {audioBlob && !recording && (
        <div className="flex min-w-0 items-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[.05] px-2 py-1">
          {previewUrl && <audio controls preload="metadata" src={previewUrl} className="h-8 max-w-[190px]" aria-label="Vista previa del mensaje de voz" />}
          <span className="font-mono text-[11px] text-slate-400">{formatDuration(elapsed)}</span>
          <button type="button" onClick={clearPreview} disabled={sending} aria-label="Eliminar grabación" title="Eliminar grabación" className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white"><Trash2 size={15} /></button>
          <button type="button" onClick={() => void sendRecording()} disabled={sending} aria-label="Enviar mensaje de voz" title="Enviar mensaje de voz" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-cyan-300/15 text-cyan-100 hover:bg-cyan-300/25 disabled:opacity-50">{sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}</button>
        </div>
      )}
    </div>
  )
}
