'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, MessageCircle, Search, UserRound, Users, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Contact {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: string
  is_active: boolean
  store_name: string | null
  is_verified: boolean | null
}

function looksLikePin(value: string) {
  return /^CRD-[A-Z0-9]{10}$/i.test(value.trim())
}

export default function CrediContactDirectory() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [myPin, setMyPin] = useState<string | null>(null)
  const [contact, setContact] = useState<Contact | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [groupMembers, setGroupMembers] = useState<Contact[]>([])
  const [groupTitle, setGroupTitle] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)

useEffect(() => {
    const supabase = createClient()
    void supabase.rpc('ensure_my_credi_pin').then(({ data, error: rpcError }: { data: string | null; error: { message: string } | null }) => {
      if (!rpcError && typeof data === 'string') setMyPin(data)
    })
  }, [])

  async function searchContact() {
    const value = identifier.trim()
    if (!value) return
    setBusy(true)
    setError(null)
    setNotice(null)
    setContact(null)
    const supabase = createClient()
    const { data, error: rpcError } = await supabase.rpc('get_credi_contact', { p_identifier: value })
    if (rpcError) {
      setError(rpcError.message || 'No fue posible buscar el contacto.')
    } else if (data?.[0]) {
      setContact(data[0] as Contact)
    } else {
      setError(looksLikePin(value)
        ? 'No encontramos un participante activo con ese PIN Credi.'
        : 'No encontramos un participante activo con ese PIN o número internacional.')
    }
    setBusy(false)
  }

  function copyPin() {
    if (!myPin) return
    void navigator.clipboard.writeText(myPin).then(() => {
      setNotice('PIN copiado al portapapeles.')
    }).catch(() => setNotice('PIN: ' + myPin))
  }


  function addGroupMember() {
    if (!contact) return
    setGroupMembers((current) => current.some((member) => member.id === contact.id)
      ? current
      : [...current, contact])
    setNotice(null)
    setError(null)
  }

  function removeGroupMember(userId: string) {
    setGroupMembers((current) => current.filter((member) => member.id !== userId))
  }

  async function createGroup() {
    if (groupMembers.length < 2 || groupMembers.length > 24) {
      setError('Selecciona entre 2 y 24 contactos para crear un grupo.')
      return
    }
    const title = groupTitle.trim()
    if (title.length < 2 || title.length > 120) {
      setError('El nombre del grupo debe tener entre 2 y 120 caracteres.')
      return
    }

    setCreatingGroup(true)
    setError(null)
    setNotice(null)
    try {
      const supabase = createClient()
      const { data, error: rpcError } = await supabase.rpc('create_credichat_group_conversation', {
        p_title: title,
        p_member_user_ids: groupMembers.map((member) => member.id),
      })
      if (rpcError) throw rpcError
      const conversationId = typeof data === 'string' ? data : ''
      if (!conversationId) throw new Error('La creación del grupo no devolvió una conversación válida.')
      window.location.assign('/chat?conversation=' + encodeURIComponent(conversationId))
    } catch (cause) {
      const message = cause && typeof cause === 'object' && 'message' in cause
        ? String((cause as { message?: unknown }).message || '')
        : ''
      setError(message || 'No fue posible crear el grupo. Comprueba que la migración de seguridad del Chat esté aplicada.')
    } finally {
      setCreatingGroup(false)
    }
  }

  function openChat() {
    if (!contact) return
    router.push(`/chat?to=${encodeURIComponent(contact.id)}`)
  }

  return (
    <section className="mb-4 rounded-[1.75rem] border border-cyan-300/10 bg-[#08101f] p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Directorio Credi</p>
          <h2 className="mt-1 text-lg font-black text-white sm:text-xl">Conecta por PIN Credi o número internacional</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">Busca vendedores, proveedores, empresarios, afiliados y otros participantes mediante su PIN Credi o su número telefónico internacional, sin mostrar el teléfono públicamente.</p>
        </div>
        {myPin && <button type="button" onClick={copyPin} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[.06] px-3 py-2 text-xs font-black text-cyan-100 hover:bg-cyan-300/[.1]"><span>Mi PIN: {myPin}</span><Copy size={14} /></button>}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-3 size-4 text-slate-500" />
          <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void searchContact() }} placeholder="PIN Credi o +código de país + número" maxLength={32} inputMode="tel" className="w-full rounded-xl border border-white/10 bg-white/[.04] py-3 pl-9 pr-3 text-sm font-semibold tracking-[.04em] text-white outline-none placeholder:text-slate-500" aria-label="PIN Credi o número telefónico internacional del contacto" />
        </div>
        <button type="button" onClick={() => void searchContact()} disabled={busy || !identifier.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-40"><Search size={16} /> {busy ? 'Buscando…' : 'Buscar contacto'}</button>
      </div>
      {notice && <p className="mt-3 text-xs font-semibold text-emerald-200"><Check className="mr-1 inline size-3.5" />{notice}</p>}
      {error && <p className="mt-3 text-xs font-semibold text-rose-200">{error}</p>}
      {contact && <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cyan-300/10 text-cyan-100">{contact.avatar_url ? <img src={contact.avatar_url} alt="" className="size-full object-cover" /> : <UserRound size={22} />}</div><div className="min-w-0"><p className="truncate text-sm font-black text-white">{contact.full_name || 'Participante Credi'}</p><p className="truncate text-xs text-slate-400">{contact.store_name || contact.role} {contact.is_verified ? '· Verificado' : ''}</p></div></div><div className="flex flex-wrap gap-2">
          <button type="button" onClick={openChat} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-black text-white hover:bg-white/15"><MessageCircle size={16} /> Abrir Credi Chat</button>
          <button type="button" onClick={addGroupMember} disabled={groupMembers.some((member) => member.id === contact.id)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[.08] px-4 py-2.5 text-xs font-black text-cyan-100 disabled:opacity-40"><Users size={16} /> {groupMembers.some((member) => member.id === contact.id) ? 'Añadido al grupo' : 'Añadir al grupo'}</button>
        </div></div>}

      {groupMembers.length > 0 && <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/[.04] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm font-black text-white">Nuevo grupo privado</p><p className="mt-1 text-xs text-slate-400">Selecciona entre 2 y 24 contactos. Tú serás administrador; cada persona recibirá una invitación que debe aceptar para entrar.</p></div>
          <span className="rounded-full border border-cyan-300/20 px-2.5 py-1 text-[10px] font-black text-cyan-100">{groupMembers.length}/24 contactos</span>
        </div>
        <label className="mt-3 block text-xs font-bold text-slate-300">Nombre del grupo
          <input value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} maxLength={120} placeholder="Ej. Proveedores de tecnología" className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/40" />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {groupMembers.map((member) => <span key={member.id} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-xs font-semibold text-slate-100">
            {member.full_name || member.role}
            <button type="button" onClick={() => removeGroupMember(member.id)} aria-label={'Quitar ' + (member.full_name || 'contacto')} className="text-slate-400 hover:text-white"><X size={13} /></button>
          </span>)}
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => { setGroupMembers([]); setGroupTitle('') }} disabled={creatingGroup} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-300 disabled:opacity-40">Cancelar</button>
          <button type="button" onClick={() => void createGroup()} disabled={creatingGroup || groupMembers.length < 2 || !groupTitle.trim()} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950 disabled:opacity-40"><Users size={15} /> {creatingGroup ? 'Creando grupo…' : 'Crear grupo seguro'}</button>
        </div>
      </div>}
    </section>
  )
}
