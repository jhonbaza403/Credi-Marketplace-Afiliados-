'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [state, setState] = useState<'ready' | 'busy' | 'error'>('ready')
  const [message, setMessage] = useState('Este enlace es de un solo uso y puede caducar.')

  useEffect(() => {
    if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) {
      setState('error')
      setMessage('El enlace de invitación no es válido.')
    }
  }, [token])

  async function accept() {
    setState('busy')
    try {
      const response = await fetch('/api/channels/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const payload = await response.json().catch(() => ({}))
      if (response.status === 401) {
        window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
        return
      }
      if (!response.ok) throw new Error(payload.error || 'No fue posible aceptar la invitación.')
      window.location.assign(`/canales/${encodeURIComponent(payload.handle)}`)
    } catch (cause) {
      setState('error')
      setMessage(cause instanceof Error ? cause.message : 'No fue posible aceptar la invitación.')
    }
  }

  return (
    <main className="grid min-h-[70vh] place-items-center bg-[var(--background)] px-4 py-10 text-[var(--foreground)]">
      <section className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <p className="text-xs font-black uppercase tracking-[.2em] text-[var(--primary)]">Canales Credi</p>
        <h1 className="mt-3 text-2xl font-black">Invitación a canal privado</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{message}</p>
        <button type="button" disabled={state !== 'ready'} onClick={accept} className="mt-6 min-h-11 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-black text-white disabled:opacity-60">
          {state === 'busy' ? 'Aceptando…' : 'Aceptar invitación'}
        </button>
      </section>
    </main>
  )
}

export default function AcceptChannelInvitePage() {
  return <Suspense fallback={<main className="p-8 text-center">Cargando invitación…</main>}><AcceptInviteContent /></Suspense>
}
