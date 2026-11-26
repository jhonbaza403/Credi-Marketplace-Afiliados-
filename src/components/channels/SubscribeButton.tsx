'use client'

import { useEffect, useState } from 'react'

type MembershipState = 'loading' | 'not_joined' | 'active' | 'pending' | 'muted' | 'unauthenticated' | 'busy'

export default function SubscribeButton({ channelId }: { channelId: string }) {
  const [state, setState] = useState<MembershipState>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/channels/${encodeURIComponent(channelId)}/subscribe`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (cancelled) return
        if (!response.ok) throw new Error(payload.error || 'No fue posible comprobar la suscripción.')
        setState(payload.authenticated ? (payload.state as MembershipState) : 'unauthenticated')
      })
      .catch(() => { if (!cancelled) setState('not_joined') })
    return () => { cancelled = true }
  }, [channelId])

  async function toggle() {
    if (state === 'unauthenticated') {
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    if (state === 'loading' || state === 'busy') return
    setState('busy')
    setError('')
    try {
      const leaving = state === 'active' || state === 'pending' || state === 'muted'
      const response = await fetch(`/api/channels/${encodeURIComponent(channelId)}/subscribe`, {
        method: leaving ? 'DELETE' : 'POST',
      })
      const payload = await response.json().catch(() => ({}))
      if (response.status === 401) {
        setState('unauthenticated')
        return
      }
      if (!response.ok) throw new Error(payload.error || 'No fue posible actualizar la suscripción.')
      setState(leaving ? 'not_joined' : payload.state)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible actualizar la suscripción.')
      setState('not_joined')
    }
  }

  const label = state === 'loading' || state === 'busy'
    ? 'Procesando…'
    : state === 'active'
      ? 'Suscrito · Salir'
      : state === 'pending'
        ? 'Solicitud pendiente · Cancelar'
        : state === 'muted'
          ? 'Suscrito (silenciado) · Salir'
          : state === 'unauthenticated'
          ? 'Iniciar sesión para suscribirte'
          : 'Suscribirme'

  return (
    <div className="space-y-1">
      <button type="button" onClick={toggle} disabled={state === 'loading' || state === 'busy'} className="min-h-10 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-black text-white disabled:opacity-60">
        {label}
      </button>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
