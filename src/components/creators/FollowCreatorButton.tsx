'use client'

import { useEffect, useState } from 'react'

export default function FollowCreatorButton({ handle, allowFollowers }: { handle: string; allowFollowers: boolean }) {
  const [following, setFollowing] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/creators/${encodeURIComponent(handle)}/follow`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!cancelled && response.ok) {
          setFollowing(Boolean(payload.following))
          setAuthenticated(Boolean(payload.authenticated))
        }
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [handle])

  async function toggle() {
    if (!authenticated) {
      window.location.assign(`/login?next=${encodeURIComponent(`/creadores/${handle}`)}`)
      return
    }
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/creators/${encodeURIComponent(handle)}/follow`, { method: following ? 'DELETE' : 'POST' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'No fue posible actualizar el seguimiento.')
      setFollowing(Boolean(payload.following))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible actualizar el seguimiento.')
    } finally {
      setBusy(false)
    }
  }

  if (!allowFollowers) return <p className="text-sm text-[var(--muted)]">Este perfil no admite seguidores.</p>
  return (
    <div className="space-y-1">
      <button type="button" onClick={toggle} disabled={busy} className="min-h-10 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-black text-white disabled:opacity-60">
        {busy ? 'Actualizando…' : following ? 'Dejar de seguir' : authenticated ? 'Seguir creador' : 'Iniciar sesión para seguir'}
      </button>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
