'use client'

import { useCallback, useEffect, useState } from 'react'
import { BellRing, Check, Clock3, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Invitation = {
  invitation_id: string
  conversation_id: string
  group_title: string
  inviter_id: string
  inviter_name: string
  invited_at: string
  expires_at: string
}

export default function CrediChatGroupInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const supabase = createClient()
    const { data, error: listError } = await supabase.rpc('list_my_credichat_group_invitations')
    if (listError) {
      // The group-invitation migration may not be present in every environment yet.
      // Keep this optional panel out of the way instead of covering Chat with a blocking alert.
      setError('')
      setInvitations([])
      return
    }
    setError('')
    setInvitations(Array.isArray(data) ? data as Invitation[] : [])
  }, [])

  useEffect(() => {
    let active = true
    void refresh().finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refresh])

  async function respond(invitation: Invitation, accept: boolean) {
    setWorkingId(invitation.invitation_id)
    setError('')
    try {
      const supabase = createClient()
      const { data, error: responseError } = await supabase.rpc('respond_credichat_group_invitation', {
        p_invitation_id: invitation.invitation_id,
        p_accept: accept,
      })
      if (responseError) throw responseError
      if (data !== true) {
        await refresh()
        return
      }
      if (accept) {
        window.location.assign('/chat?conversation=' + encodeURIComponent(invitation.conversation_id))
        return
      }
      setInvitations(current => current.filter(item => item.invitation_id !== invitation.invitation_id))
    } catch (cause) {
      const message = cause && typeof cause === 'object' && 'message' in cause
        ? String((cause as { message?: unknown }).message || '')
        : ''
      setError(message || 'No fue posible responder a la invitación.')
    } finally {
      setWorkingId(null)
    }
  }

  if (loading || invitations.length === 0) return null

  return (
    <section aria-label="Invitaciones a grupos Credi" className="marketplace-card rounded-2xl p-3 shadow-sm sm:p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] text-[var(--primary)]"><BellRing size={17} /></span>
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Invitaciones a grupos</h2>
        <span className="ml-auto rounded-full bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] px-2.5 py-1 text-xs font-semibold text-[var(--primary)]">{invitations.length}</span>
      </div>

      {error && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {invitations.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {invitations.map(invitation => (
          <article key={invitation.invitation_id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">{invitation.group_title}</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">Invita: {invitation.inviter_name || 'Participante Credi'}</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--muted)]"><Clock3 size={13} /> Vence: {new Date(invitation.expires_at).toLocaleDateString('es')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={workingId !== null} onClick={() => void respond(invitation, true)} className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-300 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-40"><Check size={14} /> {workingId === invitation.invitation_id ? 'Procesando…' : 'Aceptar invitación'}</button>
              <button type="button" disabled={workingId !== null} onClick={() => void respond(invitation, false)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 disabled:opacity-40"><X size={14} /> Rechazar</button>
            </div>
          </article>
        ))}
      </div>}
    </section>
  )
}
