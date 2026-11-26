'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'

type CreatorProfile = {
  handle?: string
  display_name?: string
  bio?: string
  category?: string | null
  visibility?: 'public' | 'unlisted' | 'private'
  is_published?: boolean
  allow_followers?: boolean
}

export default function CreatorProfileForm({ initial }: { initial?: CreatorProfile | null }) {
  const [handle, setHandle] = useState(initial?.handle ?? '')
  const [displayName, setDisplayName] = useState(initial?.display_name ?? '')
  const [bio, setBio] = useState(initial?.bio ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [visibility, setVisibility] = useState<NonNullable<CreatorProfile['visibility']>>(initial?.visibility ?? 'public')
  const [published, setPublished] = useState(initial?.is_published ?? true)
  const [allowFollowers, setAllowFollowers] = useState(initial?.allow_followers ?? true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/creators/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle,
          display_name: displayName,
          bio,
          category: category.trim() || null,
          visibility,
          is_published: published,
          allow_followers: allowFollowers,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (response.status === 401) {
        window.location.assign(`/login?next=${encodeURIComponent('/creadores')}`)
        return
      }
      if (!response.ok) throw new Error(payload.error || 'No fue posible guardar el perfil.')
      window.location.assign(`/creadores/${encodeURIComponent(payload.profile.handle)}`)
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No fue posible guardar el perfil.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-lg font-black">{initial ? 'Editar perfil de creador' : 'Crear perfil de creador'}</h2>
      <label className="block text-sm font-semibold">Nombre público
        <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required minLength={2} maxLength={100} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3" />
      </label>
      <label className="block text-sm font-semibold">Handle
        <input value={handle} onChange={(event) => setHandle(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} required minLength={3} maxLength={30} pattern="[a-z0-9][a-z0-9_]{2,29}" className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3" placeholder="mi_handle" />
      </label>
      <label className="block text-sm font-semibold">Categoría
        <input value={category ?? ''} onChange={(event) => setCategory(event.target.value)} maxLength={80} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3" placeholder="Arte, educación, comercio…" />
      </label>
      <label className="block text-sm font-semibold">Presentación
        <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={1800} rows={4} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3" />
      </label>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} /> Publicar perfil</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={allowFollowers} onChange={(event) => setAllowFollowers(event.target.checked)} /> Permitir seguidores</label>
      </div>
      <label className="block text-sm font-semibold">Visibilidad
        <select value={visibility} onChange={(event) => setVisibility(event.target.value as NonNullable<CreatorProfile['visibility']>)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
          <option value="public">Público</option><option value="unlisted">No listado</option><option value="private">Privado</option>
        </select>
      </label>
      {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
      <button disabled={busy} className="min-h-11 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-black text-white disabled:opacity-60">{busy ? 'Guardando…' : 'Guardar perfil'}</button>
    </form>
  )
}
