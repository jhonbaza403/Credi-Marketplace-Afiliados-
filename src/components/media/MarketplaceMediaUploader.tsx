'use client'

import { useId, useRef, useState } from 'react'
import { FileUp, ImagePlus, Smartphone, Trash2, Video } from 'lucide-react'

import type { MarketplaceMediaKind, UploadedMarketplaceMedia } from '@/lib/storage/marketplace-media'
import { uploadMarketplaceMedia } from '@/lib/storage/marketplace-media'

interface MarketplaceMediaUploaderProps {
  kind: MarketplaceMediaKind
  multiple?: boolean
  maxFiles?: number
  value?: UploadedMarketplaceMedia[]
  onChange: (items: UploadedMarketplaceMedia[]) => void
}

export default function MarketplaceMediaUploader({
  kind,
  multiple = true,
  maxFiles = kind === 'video' ? 1 : 8,
  value = [],
  onChange,
}: MarketplaceMediaUploaderProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || !fileList.length || busy) return
    setMessage(null)

    const remaining = Math.max(0, maxFiles - value.length)
    const incoming = Array.from(fileList).slice(0, remaining)

    if (!incoming.length) {
      setMessage(`Máximo ${maxFiles} archivo${maxFiles === 1 ? '' : 's'}.`)
      return
    }

    setBusy(true)
    const uploaded: UploadedMarketplaceMedia[] = []

    try {
      for (let index = 0; index < incoming.length; index += 1) {
        setProgress(Math.round((index / incoming.length) * 100))
        uploaded.push(await uploadMarketplaceMedia(incoming[index], kind))
      }
      setProgress(100)
      onChange([...value, ...uploaded].slice(0, maxFiles))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible cargar el archivo.')
    } finally {
      setBusy(false)
      window.setTimeout(() => setProgress(0), 500)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function removeItem(path: string) {
    onChange(value.filter((item) => item.path !== path))
  }

  const accept = kind === 'video'
    ? 'video/mp4,video/webm,video/quicktime'
    : 'image/jpeg,image/png,image/webp,image/gif'

  const label = kind === 'video' ? 'vídeo' : 'imágenes'
  const Icon = kind === 'video' ? Video : ImagePlus

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragActive(false)
          void handleFiles(event.dataTransfer.files)
        }}
        className={`rounded-3xl border-2 border-dashed p-5 transition sm:p-6 ${
          dragActive ? 'border-cyan-300 bg-cyan-300/10' : 'border-white/15 bg-white/[0.035]'
        }`}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple && maxFiles > 1}
          className="sr-only"
          disabled={busy || value.length >= maxFiles}
          onChange={(event) => void handleFiles(event.target.files)}
        />

        <div className="flex flex-col items-center text-center">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_12px_40px_rgba(0,220,255,.12)]">
            <Icon className="size-8" aria-hidden="true" />
          </div>

          <h3 className="text-base font-black text-white sm:text-lg">
            {busy ? `Cargando ${label}…` : `Carga tus ${label} desde tu dispositivo`}
          </h3>
          <p className="mt-2 max-w-xl text-xs leading-5 text-slate-300 sm:text-sm">
            En computadora abre el selector de archivos. En Android o iPhone puedes elegir fotos y vídeos directamente desde el dispositivo.
          </p>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy || value.length >= maxFiles}
            className="mt-5 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3.5 text-sm font-black text-slate-950 shadow-[0_14px_35px_rgba(34,211,238,.16)] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileUp className="size-5" aria-hidden="true" />
            {kind === 'video' ? 'Seleccionar vídeo desde mi dispositivo' : 'Seleccionar imágenes desde mi dispositivo'}
          </button>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5"><Smartphone className="size-3.5" aria-hidden="true" />Computadora · Android · iPhone</span>
            <span aria-hidden="true">•</span>
            <span>{kind === 'video' ? 'MP4, WebM o MOV · hasta 500 MB' : 'JPG, PNG, WebP o GIF · hasta 20 MB por imagen'}</span>
          </div>

          <p className="mt-3 text-[11px] text-slate-500">
            También puedes arrastrar y soltar {kind === 'video' ? 'el vídeo' : 'las imágenes'} desde una computadora.
          </p>

          {busy && (
            <div className="mt-5 w-full max-w-sm">
              <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span>Subiendo…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {message && (
        <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{message}</p>
      )}

      {!!value.length && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {value.map((item) => (
            <article key={item.path} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
              {item.kind === 'video' ? (
                <video src={item.url} controls preload="metadata" className="aspect-video w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.name} className="aspect-[4/3] w-full object-cover" />
              )}
              <div className="flex items-center justify-between gap-3 p-3">
                <p className="min-w-0 truncate text-xs text-slate-200">{item.name}</p>
                <button type="button" onClick={() => removeItem(item.path)} aria-label={`Quitar ${item.name}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-white/10">
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Quitar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
