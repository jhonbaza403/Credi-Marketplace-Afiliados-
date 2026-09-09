'use client'

import { useId, useState } from 'react'
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
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState<string | null>(null)

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || !fileList.length || busy) return
    setMessage(null)

    const incoming = Array.from(fileList).slice(0, maxFiles - value.length)
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
    }
  }

  function removeItem(path: string) {
    onChange(value.filter((item) => item.path !== path))
  }

  const accept = kind === 'video'
    ? 'video/mp4,video/webm,video/quicktime'
    : 'image/jpeg,image/png,image/webp,image/gif'

  return (
    <div className="space-y-4">
      <label
        htmlFor={inputId}
        className="group relative flex min-h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-white/15 bg-white/[0.035] p-6 text-center shadow-inner transition hover:border-cyan-400/50 hover:bg-white/[0.05]"
      >
        <input
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple && maxFiles > 1}
          className="sr-only"
          disabled={busy || value.length >= maxFiles}
          onChange={(event) => void handleFiles(event.target.files)}
        />
        <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-2xl shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_12px_40px_rgba(0,220,255,.12)]">
          {kind === 'video' ? '🎬' : '✦'}
        </div>
        <p className="font-black text-white">{busy ? `Cargando ${kind === 'video' ? 'vídeo' : 'media'}…` : `Añadir ${kind === 'video' ? 'vídeo' : 'imágenes'}`}</p>
        <p className="mt-1 text-xs text-slate-300">{kind === 'video' ? 'MP4, WebM o MOV · hasta 500 MB' : 'JPG, PNG, WebP o GIF · hasta 20 MB por imagen'}</p>
        {busy && <div className="mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${progress}%` }} /></div>}
      </label>

      {message && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{message}</p>}

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
                <button type="button" onClick={() => removeItem(item.path)} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-white/10">Quitar</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
