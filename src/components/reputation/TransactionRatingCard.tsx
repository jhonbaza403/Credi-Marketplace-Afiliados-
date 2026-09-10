'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'

type Target = {
  store_id: string
  product_id: string | null
  store_name: string
  counterpart_id: string
  counterpart_role: 'buyer' | 'seller'
  counterpart_name: string
  can_rate: boolean
  already_rated: boolean
}

type Props = { orderId: string }

const dimensionsByRole = {
  buyer: [
    ['communication', 'Comunicación'],
    ['accuracy', 'Producto y descripción'],
    ['delivery', 'Entrega'],
  ],
  seller: [
    ['communication', 'Comunicación'],
    ['payment', 'Cumplimiento de pago'],
    ['conduct', 'Conducta comercial'],
  ],
} as const

export default function TransactionRatingCard({ orderId }: Props) {
  const [targets, setTargets] = useState<Target[]>([])
  const [scores, setScores] = useState<Record<string, number>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [dimensions, setDimensions] = useState<Record<string, Record<string, number>>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void fetch(`/api/ratings?order_id=${encodeURIComponent(orderId)}`, { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json() as { targets?: Target[]; error?: string }
        if (!response.ok) throw new Error(data.error || 'RATINGS_UNAVAILABLE')
        if (active) {
          setTargets(data.targets ?? [])
          setDone(Object.fromEntries((data.targets ?? []).map((target) => [target.store_id, target.already_rated])))
        }
      })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : 'No fue posible cargar la reputación.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [orderId])

  async function submit(target: Target) {
    const score = scores[target.store_id] ?? 0
    if (!score || saving) return
    setSaving(target.store_id)
    setError(null)
    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          order_id: orderId,
          store_id: target.store_id,
          score,
          comment: comments[target.store_id] ?? '',
          dimensions: dimensions[target.store_id] ?? {},
        }),
      })
      const data = await response.json() as { success?: boolean; error?: string }
      if (!response.ok || !data.success) throw new Error(data.error || 'RATING_FAILED')
      setDone((current) => ({ ...current, [target.store_id]: true }))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No fue posible guardar la calificación.')
    } finally {
      setSaving(null)
    }
  }

  if (loading || !targets.length) return null

  return (
    <section className="mt-5 rounded-2xl border border-border bg-background/60 p-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[.16em] text-primary">Reputación verificada</p>
        <h3 className="mt-1 text-lg font-black text-foreground">Califica tu experiencia real</h3>
        <p className="mt-1 text-sm text-muted-foreground">Solo puedes valorar a la contraparte asociada a esta compra entregada.</p>
      </div>

      <div className="mt-5 space-y-5">
        {targets.map((target) => {
          const roleLabel = target.counterpart_role === 'seller' ? 'proveedor' : 'cliente'
          const selected = scores[target.store_id] ?? 0
          const roleDimensions = dimensionsByRole[target.counterpart_role]

          return (
            <article key={`${target.store_id}-${target.counterpart_role}`} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-foreground">{target.counterpart_name}</p>
                  <p className="text-xs text-muted-foreground">{target.store_name} · {roleLabel}</p>
                </div>
                {done[target.store_id] ? (
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-700">Calificación registrada</span>
                ) : (
                  <div aria-label={`Califica a ${target.counterpart_name}`} className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-label={`${value} estrellas`}
                        onClick={() => setScores((current) => ({ ...current, [target.store_id]: value }))}
                        className="rounded-lg p-1"
                      >
                        <Star size={24} fill={value <= selected ? 'currentColor' : 'none'} className={value <= selected ? 'text-amber-400' : 'text-muted-foreground'} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!done[target.store_id] && (
                <>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {roleDimensions.map(([key, label]) => {
                      const current = dimensions[target.store_id]?.[key] ?? 0
                      return (
                        <label key={key} className="rounded-xl border border-border bg-muted/30 p-3 text-xs font-bold text-foreground">
                          <span>{label}</span>
                          <select
                            value={current || ''}
                            onChange={(event) => setDimensions((all) => ({ ...all, [target.store_id]: { ...(all[target.store_id] ?? {}), [key]: Number(event.target.value) } }))}
                            className="mt-2 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs"
                          >
                            <option value="">Seleccionar</option>
                            {[1,2,3,4,5].map((value) => <option key={value} value={value}>{value} / 5</option>)}
                          </select>
                        </label>
                      )
                    })}
                  </div>
                  <textarea
                    value={comments[target.store_id] ?? ''}
                    maxLength={1200}
                    onChange={(event) => setComments((current) => ({ ...current, [target.store_id]: event.target.value }))}
                    placeholder="Cuéntale a la comunidad cómo fue la experiencia..."
                    rows={3}
                    className="mt-3 w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    disabled={!selected || saving === target.store_id}
                    onClick={() => void submit(target)}
                    className="mt-3 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground disabled:opacity-50"
                  >
                    {saving === target.store_id ? 'Guardando…' : 'Publicar calificación'}
                  </button>
                </>
              )}
            </article>
          )
        })}
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">No fue posible procesar la calificación. Inténtalo de nuevo.</p>}
    </section>
  )
}
