'use client'

import { useCallback, useEffect, useState } from 'react'

type Member = {
  user_id: string
  role: 'owner' | 'admin' | 'subscriber'
  state: 'active' | 'pending' | 'muted' | 'left'
  joined_at: string | null
}

export default function ManageChannelMembers({ channelId }: { channelId: string }) {
  const [members, setMembers] = useState<Member[]>([])
  const [busyId, setBusyId] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/channels/${encodeURIComponent(channelId)}/members`, { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'No fue posible cargar los miembros.')
      setMembers(payload.members ?? [])
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No fue posible cargar los miembros.')
    } finally {
      setLoading(false)
    }
  }, [channelId])

  useEffect(() => { void refresh() }, [refresh])

  async function update(userId: string, state: 'active' | 'muted' | 'left') {
    setBusyId(userId)
    setMessage('')
    try {
      const response = await fetch(`/api/channels/${encodeURIComponent(channelId)}/members/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'No fue posible actualizar al miembro.')
      await refresh()
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No fue posible actualizar al miembro.')
    } finally {
      setBusyId('')
    }
  }

  const pending = members.filter((member) => member.state === 'pending')
  const active = members.filter((member) => member.state === 'active' && member.role === 'subscriber')
  const muted = members.filter((member) => member.state === 'muted' && member.role === 'subscriber')

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div>
        <h2 className="font-black">Miembros y solicitudes</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">{active.length} activos · {pending.length} solicitudes pendientes · {muted.length} silenciados</p>
      </div>
      {message && <p role="status" className="text-sm text-red-600">{message}</p>}
      {loading ? <p className="text-sm text-[var(--muted)]">Cargando miembros…</p> : (
        <>
          {pending.length > 0 && <div className="space-y-2">
            <h3 className="text-sm font-bold">Solicitudes pendientes</h3>
            {pending.map((member) => (
              <div key={member.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] p-3">
                <span className="text-xs font-mono">{member.user_id}</span>
                <button type="button" disabled={busyId === member.user_id} onClick={() => update(member.user_id, 'active')} className="min-h-9 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-bold text-white disabled:opacity-60">
                  {busyId === member.user_id ? 'Actualizando…' : 'Aprobar'}
                </button>
              </div>
            ))}
          </div>}
          {active.length > 0 && <div className="space-y-2">
            <h3 className="text-sm font-bold">Miembros activos</h3>
            {active.slice(0, 30).map((member) => (
              <div key={member.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] p-3">
                <span className="text-xs font-mono">{member.user_id}</span>
                <div className="flex gap-2">
                  <button type="button" disabled={busyId === member.user_id} onClick={() => update(member.user_id, 'muted')} className="min-h-9 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-bold disabled:opacity-60">Silenciar</button>
                  <button type="button" disabled={busyId === member.user_id} onClick={() => update(member.user_id, 'left')} className="min-h-9 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-60">Retirar</button>
                </div>
              </div>
            ))}
          </div>}
          {muted.length > 0 && <div className="space-y-2">
            <h3 className="text-sm font-bold">Miembros silenciados</h3>
            {muted.slice(0, 30).map((member) => (
              <div key={member.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] p-3">
                <span className="text-xs font-mono">{member.user_id}</span>
                <button type="button" disabled={busyId === member.user_id} onClick={() => update(member.user_id, 'active')} className="min-h-9 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-bold disabled:opacity-60">Reactivar</button>
              </div>
            ))}
          </div>}
          {members.length === 0 && <p className="text-sm text-[var(--muted)]">Todavía no hay suscriptores.</p>}
        </>
      )}
    </section>
  )
}
