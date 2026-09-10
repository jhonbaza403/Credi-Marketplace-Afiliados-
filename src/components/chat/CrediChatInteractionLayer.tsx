'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Mic, Square, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uploadCrediBusinessChatMedia } from '@/lib/storage/credibusiness-chat-media'

type VoiceState = 'idle' | 'recording' | 'uploading'

type AudioSupport = {
  mimeType: string
  extension: string
}

function pickAudioFormat(): AudioSupport | null {
  if (typeof MediaRecorder === 'undefined') return null
  const candidates: AudioSupport[] = [
    { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
    { mimeType: 'audio/webm', extension: 'webm' },
    { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg' },
    { mimeType: 'audio/mp4', extension: 'm4a' },
  ]
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate.mimeType)) ?? null
}

function putNewline(textarea: HTMLTextAreaElement) {
  const start = textarea.selectionStart ?? textarea.value.length
  const end = textarea.selectionEnd ?? start
  textarea.setRangeText('\n', start, end, 'end')
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

export default function CrediChatInteractionLayer() {
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])
  const [state, setState] = useState<VoiceState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let timer: number | null = null
    if (state === 'recording') {
      timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    } else {
      setElapsed(0)
    }
    return () => {
      if (timer !== null) window.clearInterval(timer)
    }
  }, [state])

  useEffect(() => {
    const updateVoiceButton = () => {
      const button = document.querySelector<HTMLButtonElement>('[aria-label*="voz" i], [aria-label*="grabación" i]')
      if (!button) return
      button.dataset.crediVoiceState = state
      button.setAttribute('aria-label', state === 'recording' ? 'Detener grabación' : 'Grabar nota de voz')
      button.title = state === 'recording' ? 'Detener grabación' : 'Grabar nota de voz'
      button.classList.toggle('!bg-rose-500/20', state === 'recording')
      button.classList.toggle('!text-rose-200', state === 'recording')
      button.classList.toggle('!ring-2', state === 'recording')
      button.classList.toggle('!ring-rose-400/30', state === 'recording')
    }
    updateVoiceButton()
    const observer = new MutationObserver(updateVoiceButton)
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-label'] })
    return () => observer.disconnect()
  }, [state])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (!target || target.tagName !== 'TEXTAREA') return
      if (event.key !== 'Enter' || event.ctrlKey || event.metaKey || event.altKey) return
      if (!window.location.pathname.startsWith('/chat')) return
      event.preventDefault()
      event.stopPropagation()
      putNewline(target as HTMLTextAreaElement)
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const button = target?.closest<HTMLButtonElement>('[aria-label*="voz" i], [aria-label*="grabación" i]')
      if (!button || !window.location.pathname.startsWith('/chat')) return
      event.preventDefault()
      event.stopPropagation()
      void (state === 'recording' ? stopRecording() : startRecording())
    }

    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('click', onClick, true)
    }
  }, [state])

  async function sendVoice(blob: Blob, format: AudioSupport) {
    const conversationId = new URLSearchParams(window.location.search).get('conversation')
    if (!conversationId) throw new Error('Selecciona una conversación antes de grabar una nota de voz.')

    const supabase = createClient()
    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (authError || !auth.user) throw new Error('Debes iniciar sesión para enviar una nota de voz.')

    const file = new File([blob], `nota-de-voz-${Date.now()}.${format.extension}`, { type: format.mimeType })
    const media = await uploadCrediBusinessChatMedia(file)

    const { data: inserted, error: messageError } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: auth.user.id,
      message_type: 'audio',
      reply_to_id: null,
      metadata: {
        file_name: media.name,
        public_url: media.url,
        storage_path: media.path,
        mime_type: media.contentType,
        size_bytes: media.size,
        voice_note: true,
      },
    }).select('id').single()
    if (messageError || !inserted) throw messageError ?? new Error('No fue posible crear el mensaje de voz.')

    const { error: attachmentError } = await supabase.from('message_attachments').insert({
      message_id: inserted.id,
      storage_path: media.path,
      public_url: media.url,
      file_name: media.name,
      mime_type: media.contentType,
      size_bytes: media.size,
    })
    if (attachmentError) throw attachmentError
  }

  async function startRecording() {
    if (state !== 'idle') return
    setMessage(null)
    const format = pickAudioFormat()
    if (!format) {
      setMessage('Este navegador no permite grabar audio desde Credi Chat.')
      return
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('El navegador no permite acceder al micrófono.')
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      stream.current = mediaStream
      chunks.current = []
      const mediaRecorder = new MediaRecorder(mediaStream, { mimeType: format.mimeType })
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data)
      }
      mediaRecorder.onerror = () => {
        setMessage('La grabación de audio se interrumpió.')
        void stopRecording()
      }
      mediaRecorder.onstop = () => {
        mediaStream.getTracks().forEach((track) => track.stop())
        stream.current = null
        const blob = new Blob(chunks.current, { type: format.mimeType })
        chunks.current = []
        if (!blob.size) {
          setState('idle')
          setMessage('La grabación quedó vacía. Inténtalo nuevamente.')
          return
        }
        setState('uploading')
        void sendVoice(blob, format)
          .then(() => {
            setMessage('Nota de voz enviada.')
            setState('idle')
          })
          .catch((error: unknown) => {
            setMessage(error instanceof Error ? error.message : 'No fue posible enviar la nota de voz.')
            setState('idle')
          })
      }
      recorder.current = mediaRecorder
      mediaRecorder.start(250)
      setState('recording')
    } catch (error) {
      stream.current?.getTracks().forEach((track) => track.stop())
      stream.current = null
      setState('idle')
      setMessage(error instanceof Error ? error.message : 'No fue posible acceder al micrófono. Revisa el permiso del navegador.')
    }
  }

  async function stopRecording() {
    const current = recorder.current
    if (!current || current.state === 'inactive') {
      stream.current?.getTracks().forEach((track) => track.stop())
      stream.current = null
      setState('idle')
      return
    }
    current.stop()
    recorder.current = null
  }

  useEffect(() => () => {
    recorder.current?.stop()
    recorder.current = null
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
  }, [])

  const time = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`

  return (
    <>
      {state !== 'idle' && (
        <div className="fixed bottom-5 left-1/2 z-[145] flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-white shadow-2xl backdrop-blur-md">
          <span className={`flex size-9 items-center justify-center rounded-xl ${state === 'recording' ? 'bg-rose-500/15 text-rose-200' : 'bg-cyan-300/10 text-cyan-200'}`}>
            {state === 'recording' ? <Mic size={17} /> : <Check size={17} />}
          </span>
          <div className="min-w-[130px]">
            <p className="text-xs font-black">{state === 'recording' ? `Grabando · ${time}` : 'Enviando nota de voz…'}</p>
            <p className="text-[10px] text-slate-400">{state === 'recording' ? 'Pulsa el micrófono para detener' : 'Subiendo y guardando en Credi Chat'}</p>
          </div>
          {state === 'recording' && <button type="button" onClick={() => void stopRecording()} className="flex size-10 items-center justify-center rounded-xl bg-rose-500 text-white" aria-label="Detener grabación"><Square size={16} /></button>}
        </div>
      )}
      {message && <div className="fixed bottom-5 right-5 z-[146] flex max-w-sm items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/95 p-4 text-xs text-slate-200 shadow-2xl"><span className="flex-1">{message}</span><button type="button" onClick={() => setMessage(null)} aria-label="Cerrar"><X size={15} /></button></div>}
    </>
  )
}
