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
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async () => {
    const supabase = createClient()
    const { data, error: listError } = await supabase.rpc('list_my_credichat_group_invitations')
    if (listError) {
      setError('No fue posible consultar las invitaciones a grupos.')
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
    setNotice('')
    try {
      const supabase = createClient()
      const { data, error: responseError } = await supabase.rpc('respond_credichat_group_invitation', {
        p_invitation_id: invitation.invitation_id,
        p_accept: accept,
      })
      if (responseError) throw responseError
      if (data !== true) {
        setNotice('La invitación venció o el administrador dejó de tener permisos. Actualiza la lista.')
        await refresh()
        return
      }
      if (accept) {
        window.location.assign('/chat?conversation=' + encodeURIComponent(invitation.conversation_id))
        return
      }
      setInvitations(current => current.filter(item => item.invitation_id !== invitation.invitation_id))
      setNotice('Invitación rechazada.')
    } catch (cause) {
      const message = cause && typeof cause === 'object' && 'message' in cause
        ? String((cause as { message?: unknown }).message || '')
        : ''
      setError(message || 'No fue posible responder a la invitación.')
    } finally {
      setWorkingId(null)
    }
  }

  if (!loading && invitations.length === 0 && !error && !notice) return null

  return (
    <section aria-label="Invitaciones a grupos Credi" className="rounded-3xl border border-cyan-300/15 bg-[#0a1425] p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-100"><BellRing size={19} /></span>
        <div>
          <h2 className="text-base font-black text-white">Invitaciones a grupos</h2>
          <p className="text-xs text-slate-400">Solo formas parte de un grupo cuando aceptas su invitación.</p>
        </div>
        {invitations.length > 0 && <span className="ml-auto rounded-full bg-cyan-300/10 px-2.5 py-1 text-xs font-black text-cyan-100">{invitations.length}</span>}
      </div>

      {error && <p role="alert" className="mt-3 rounded-xl border border-rose-300/20 bg-rose-300/[.06] p-3 text-xs text-rose-100">{error}</p>}
      {notice && <p role="status" className="mt-3 rounded-xl border border-cyan-300/15 bg-cyan-300/[.05] p-3 text-xs text-cyan-100">{notice}</p>}
      {loading && <p className="mt-3 text-xs text-slate-400">Consultando invitaciones…</p>}

      {invitations.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {invitations.map(invitation => (
          <article key={invitation.invitation_id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <h3 className="font-black text-white">{invitation.group_title}</h3>
            <p className="mt-1 text-xs text-slate-300">Invita: {invitation.inviter_name || 'Participante Credi'}</p>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400"><Clock3 size={13} /> Vence: {new Date(invitation.expires_at).toLocaleDateString('es')}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={workingId !== null} onClick={() => void respond(invitation, true)} className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-300 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-40"><Check size={14} /> {workingId === invitation.invitation_id ? 'Procesando…' : 'Aceptar invitación'}</button>
              <button type="button" disabled={workingId !== null} onClick={() => void respond(invitation, false)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 disabled:opacity-40"><X size={14} /> Rechazar</button>
            </div>
          </article>
        ))}
      </div>}
    </section>
  )
}
