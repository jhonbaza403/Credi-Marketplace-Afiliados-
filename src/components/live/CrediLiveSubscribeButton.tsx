'use client'

import { useEffect, useState } from 'react'
import { Bell, BellRing } from 'lucide-react'

type State = { followerCount: number; isFollowing: boolean; isOwner: boolean }

export function CrediLiveSubscribeButton({ channelId }: { channelId: string }) {
  const [state, setState] = useState<State | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/live/subscriptions?channelId=' + encodeURIComponent(channelId), { cache: 'no-store' })
      .then(async response => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las suscripciones.')
        if (!cancelled) setState({ followerCount: data.followerCount, isFollowing: data.isFollowing, isOwner: data.isOwner })
      })
      .catch(cause => { if (!cancelled) setMessage(cause instanceof Error ? cause.message : 'No se pudo cargar el canal.') })
    return () => { cancelled = true }
  }, [channelId])

  async function toggle() {
    if (!state || state.isOwner || busy) return
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/live/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, action: state.isFollowing ? 'unsubscribe' : 'subscribe' }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar la suscripción.')
      setState({ followerCount: data.followerCount, isFollowing: data.isFollowing, isOwner: data.isOwner })
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No se pudo actualizar la suscripción.')
    } finally {
      setBusy(false)
    }
  }

  if (state?.isOwner) return <p className="mt-3 text-xs text-[var(--muted)]">Tu canal · {state.followerCount} suscriptores</p>
  return <div className="mt-3">
    <button type="button" onClick={() => void toggle()} disabled={!state || busy} className={'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black disabled:opacity-50 ' + (state?.isFollowing ? 'border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--foreground)]' : 'bg-[var(--primary)] text-white')}>
      {state?.isFollowing ? <BellRing className="size-4" /> : <Bell className="size-4" />}
      {busy ? 'Actualizando…' : state?.isFollowing ? 'Suscrito' : 'Suscribirse'}
      <span className="opacity-80">· {state?.followerCount ?? '—'}</span>
    </button>
    {message && <p role="status" className="mt-2 text-xs text-rose-600">{message}</p>}
  </div>
}
