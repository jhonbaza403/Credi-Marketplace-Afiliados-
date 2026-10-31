'use client'

import { useEffect, useState } from 'react'
import { Check, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { FEED_INTERESTS, type FeedRankingMode } from '@/lib/social/feed-ranking'

type Preferences = { interests: string[]; feed_mode: FeedRankingMode }
const defaults: Preferences = { interests: [], feed_mode: 'chronological' }

export default function SocialFeedPreferences() {
  const [preferences, setPreferences] = useState<Preferences>(defaults)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void fetch('/api/social/preferences', { cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 401 || response.status === 503) return null
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'No fue posible cargar tus preferencias.')
        return body.preferences as Preferences
      })
      .then((data) => {
        if (!active || !data) return
        setPreferences({
          interests: Array.isArray(data.interests) ? data.interests : [],
          feed_mode: data.feed_mode === 'interests' ? 'interests' : 'chronological',
        })
        setReady(true)
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'No fue posible cargar tus preferencias.')
      })
    return () => { active = false }
  }, [])

  function toggleInterest(id: string) {
    setPreferences((current) => {
      const exists = current.interests.includes(id)
      if (!exists && current.interests.length >= 8) return current
      return {
        ...current,
        interests: exists ? current.interests.filter((interest) => interest !== id) : [...current.interests, id],
      }
    })
    setMessage('')
  }

  async function save(next = preferences) {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/social/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'No fue posible guardar tus preferencias.')
      const saved = body.preferences as Preferences
      setPreferences({
        interests: Array.isArray(saved.interests) ? saved.interests : [],
        feed_mode: saved.feed_mode === 'interests' ? 'interests' : 'chronological',
      })
      setMessage('Preferencias guardadas. El Muro se ordenará según tu selección.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible guardar tus preferencias.')
    } finally {
      setSaving(false)
    }
  }

  async function reset() {
    const next: Preferences = { interests: [], feed_mode: 'chronological' }
    setPreferences(next)
    await save(next)
  }

  if (!ready) return null

  return (
    <section aria-label="Preferencias del Muro" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-[var(--foreground)]">
            <SlidersHorizontal className="size-4 text-[var(--primary)]" />
            Personaliza tu Muro
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Elige hasta ocho temas. Solo utilizamos las preferencias que guardas aquí; puedes volver al orden cronológico o borrarlas cuando quieras.</p>
        </div>
        <span className="rounded-full bg-[var(--surface-secondary)] px-2.5 py-1 text-[10px] font-black text-[var(--muted)]">{preferences.interests.length}/8 temas</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {FEED_INTERESTS.map((interest) => {
          const checked = preferences.interests.includes(interest.id)
          const disabled = !checked && preferences.interests.length >= 8
          const className = 'inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition ' +
            (checked
              ? 'border-[var(--primary)]/40 bg-[var(--primary)]/[.08] text-[var(--primary)]'
              : 'border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--foreground)]') +
            (disabled ? ' cursor-not-allowed opacity-40' : '')
          return (
            <label key={interest.id} className={className}>
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggleInterest(interest.id)}
                className="size-3.5 accent-current"
              />
              {interest.label}
            </label>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={preferences.feed_mode === 'interests'} onClick={() => setPreferences((current) => ({ ...current, feed_mode: 'interests' }))} className={'rounded-xl px-3 py-2 text-xs font-black ' + (preferences.feed_mode === 'interests' ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--foreground)]')}>Por mis intereses</button>
          <button type="button" aria-pressed={preferences.feed_mode === 'chronological'} onClick={() => setPreferences((current) => ({ ...current, feed_mode: 'chronological' }))} className={'rounded-xl px-3 py-2 text-xs font-black ' + (preferences.feed_mode === 'chronological' ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--foreground)]')}>Más recientes</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void reset()} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--muted)] disabled:opacity-40"><RotateCcw className="size-3.5" /> Restablecer</button>
          <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-black text-white disabled:opacity-40"><Check className="size-3.5" /> {saving ? 'Guardando…' : 'Guardar preferencias'}</button>
        </div>
      </div>
      {message && <p role="status" className="mt-3 text-xs font-semibold text-emerald-700">{message}</p>}
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-red-600">{error}</p>}
    </section>
  )
}
