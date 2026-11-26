'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateChannelPostForm({ channelId }: { channelId: string }) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [productId, setProductId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/channels/${encodeURIComponent(channelId)}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body_text: body, product_id: productId.trim() || null }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'No fue posible publicar.')
      setBody('')
      setProductId('')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible publicar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="font-black">Publicar en el canal</h2>
      <textarea value={body} onChange={(event) => setBody(event.target.value)} minLength={1} maxLength={6000} rows={4} required className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm" placeholder="Comparte una actualización con tus suscriptores…" />
      <label className="block text-xs font-semibold text-[var(--muted)]">
        Producto relacionado (ID opcional)
        <input value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" placeholder="UUID del producto Credi" />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button disabled={busy || !body.trim()} className="min-h-10 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-black text-white disabled:opacity-60">{busy ? 'Publicando…' : 'Publicar actualización'}</button>
    </form>
  )
}
