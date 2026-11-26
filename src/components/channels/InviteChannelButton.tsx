'use client'

import { useState } from 'react'

export default function InviteChannelButton({ channelId }: { channelId: string }) {
  const [busy, setBusy] = useState(false)
  const [url, setUrl] = useState('')
  const [message, setMessage] = useState('')

  async function createInvite() {
    setBusy(true)
    setMessage('')
    setUrl('')
    try {
      const response = await fetch(`/api/channels/${encodeURIComponent(channelId)}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expires_in_hours: 72 }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'No fue posible generar la invitación.')
      const inviteUrl = new URL(payload.invite_url, window.location.origin).toString()
      setUrl(inviteUrl)
      try {
        await navigator.clipboard.writeText(inviteUrl)
        setMessage('Enlace creado y copiado. Caduca en 72 horas y solo puede utilizarse una vez.')
      } catch {
        setMessage('Enlace creado. Cópialo para compartirlo; caduca en 72 horas y solo puede utilizarse una vez.')
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No fue posible generar la invitación.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <button type="button" onClick={createInvite} disabled={busy} className="min-h-10 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-bold disabled:opacity-60">
        {busy ? 'Creando enlace…' : 'Crear invitación privada'}
      </button>
      {message && <p role="status" className="text-xs text-[var(--muted)]">{message}</p>}
      {url && <input readOnly value={url} onFocus={(event) => event.currentTarget.select()} className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2 text-xs" aria-label="Enlace de invitación" />}
    </section>
  )
}
