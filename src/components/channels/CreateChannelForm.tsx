'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'

export default function CreateChannelForm() {
  const [handle, setHandle] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public')
  const [joinPolicy, setJoinPolicy] = useState<'open' | 'approval' | 'invite_only'>('open')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, title, description, visibility, join_policy: joinPolicy }),
      })
      const payload = await response.json().catch(() => ({}))
      if (response.status === 401) {
        window.location.assign(`/login?next=${encodeURIComponent('/canales')}`)
        return
      }
      if (!response.ok) throw new Error(payload.error || 'No fue posible crear el canal.')
      window.location.assign(`/canales/${encodeURIComponent(payload.channel.handle)}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible crear el canal.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-lg font-black text-[var(--foreground)]">Crear canal</h2>
      <label className="block text-sm font-semibold">
        Nombre del canal
        <input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} maxLength={120} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5" />
      </label>
      <label className="block text-sm font-semibold">
        Handle público
        <input value={handle} onChange={(event) => setHandle(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} required minLength={3} maxLength={40} pattern="[a-z0-9][a-z0-9_-]{2,39}" className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5" placeholder="mi-canal" />
      </label>
      <label className="block text-sm font-semibold">
        Descripción
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1200} rows={3} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Visibilidad
          <select value={visibility} onChange={(event) => {
            const next = event.target.value as typeof visibility
            setVisibility(next)
            if (next === 'private') setJoinPolicy('invite_only')
            else if (joinPolicy === 'invite_only') setJoinPolicy('open')
          }} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5">
            <option value="public">Público</option>
            <option value="unlisted">No listado</option>
            <option value="private">Privado (requiere invitación)</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Suscripción
          <select value={joinPolicy} onChange={(event) => setJoinPolicy(event.target.value as typeof joinPolicy)} disabled={visibility === 'private'} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 disabled:opacity-60">
            <option value="open">Entrada abierta</option>
            <option value="approval">Requiere aprobación</option>
          </select>
        </label>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
      <button disabled={busy} className="min-h-11 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-black text-white disabled:opacity-60">
        {busy ? 'Creando…' : 'Crear canal'}
      </button>
      <p className="text-xs leading-5 text-[var(--muted)]">Los canales privados quedan cerrados hasta que se habilite el flujo de invitaciones. No se publican ni se listan en el directorio.</p>
    </form>
  )
}
