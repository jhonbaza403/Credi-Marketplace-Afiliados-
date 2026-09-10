'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Paperclip, Search, Send, Smile, MessageCircle, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uploadMarketplaceMedia } from '@/lib/storage/marketplace-media'
import type { ChatConversation, ChatMessage } from '@/types/chat'

type Profile = { id: string; full_name: string | null; email: string | null; avatar_url: string | null; role: string }

export default function CrediChat() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const messageBox = useRef<HTMLDivElement>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('conversation'))
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadConversations = useCallback(async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      router.replace('/login?next=/chat')
      return
    }
    setUserId(user.id)
    const { data: memberships, error: membershipError } = await supabase.from('conversation_members').select('conversation_id').eq('user_id', user.id)
    if (membershipError) throw membershipError
    const ids = [...new Set((memberships ?? []).map((m) => m.conversation_id))]
    if (!ids.length) { setConversations([]); setLoading(false); return }
    const [{ data: rows, error: rowError }, { data: members, error: membersError }] = await Promise.all([
      supabase.from('conversations').select('id,kind,title,created_by,product_id,order_id,store_id,b2b_product_id,created_at,updated_at,metadata').in('id', ids).order('updated_at', { ascending: false }),
      supabase.from('conversation_members').select('conversation_id,user_id').in('conversation_id', ids),
    ])
    if (rowError) throw rowError
    if (membersError) throw membersError
    const memberIds = [...new Set((members ?? []).map((m) => m.user_id))]
    const map: Record<string, Profile> = {}
    if (memberIds.length) {
      const { data: people, error: peopleError } = await supabase.from('profiles').select('id,full_name,email,avatar_url,role').in('id', memberIds)
      if (peopleError) throw peopleError
      for (const person of people ?? []) map[person.id] = person as Profile
    }
    setProfiles(map)
    setConversations((rows ?? []).map((row) => {
      const ms = (members ?? []).filter((m) => m.conversation_id === row.id)
      const otherId = ms.find((m) => m.user_id !== user.id)?.user_id
      return { ...row, member_ids: ms.map((m) => m.user_id), display_name: row.title || (otherId ? map[otherId]?.full_name || map[otherId]?.email : null) || 'Usuario Credi', unread: 0 } as ChatConversation
    }))
    setLoading(false)
  }, [router, supabase])

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data, error: messageError } = await supabase.from('messages').select('id,conversation_id,sender_id,message_type,body,reply_to_id,edited_at,deleted_at,metadata,created_at').eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(500)
    if (messageError) throw messageError
    setMessages((data ?? []) as ChatMessage[])
    requestAnimationFrame(() => messageBox.current?.scrollTo({ top: messageBox.current.scrollHeight, behavior: 'smooth' }))
  }, [supabase])

  useEffect(() => { void loadConversations().catch((e) => { setError(e instanceof Error ? e.message : 'No fue posible cargar las conversaciones.'); setLoading(false) }) }, [loadConversations])
  useEffect(() => { if (selectedId) void loadMessages(selectedId).catch((e) => setError(e instanceof Error ? e.message : 'No fue posible cargar los mensajes.')) }, [loadMessages, selectedId])

  async function sendText() {
    if (!selectedId || !userId || !draft.trim() || sending) return
    setSending(true)
    try {
      const { error: insertError } = await supabase.from('messages').insert({ conversation_id: selectedId, sender_id: userId, message_type: 'text', body: draft.trim(), metadata: {} })
      if (insertError) throw insertError
      setDraft('')
      await loadMessages(selectedId)
    } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible enviar el mensaje.') } finally { setSending(false) }
  }

  async function sendFile(file: File) {
    if (!selectedId || !userId || uploading) return
    setUploading(true)
    try {
      const media = await uploadMarketplaceMedia(file)
      const { error: messageError } = await supabase.from('messages').insert({ conversation_id: selectedId, sender_id: userId, message_type: media.kind, body: null, metadata: { file_name: media.name, public_url: media.url, storage_path: media.path, mime_type: media.contentType, size_bytes: media.size } })
      if (messageError) throw messageError
      await loadMessages(selectedId)
    } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible enviar el archivo.') } finally { setUploading(false) }
  }

  const filtered = conversations.filter((c) => !search.trim() || c.display_name.toLowerCase().includes(search.toLowerCase()) || Boolean(c.title?.toLowerCase().includes(search.toLowerCase())))
  const selected = conversations.find((c) => c.id === selectedId) ?? null

  return <main className="min-h-screen bg-[#050816] text-white"><div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 lg:grid-cols-[320px_1fr]"><aside className="rounded-3xl border border-white/10 bg-white/[.03] p-4"><div className="relative"><Search className="absolute left-3 top-3.5 size-4 text-slate-500"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar conversaciones" className="w-full rounded-xl border border-white/10 bg-white/[.04] py-3 pl-9 pr-3 text-sm outline-none"/></div><div className="mt-4">{loading?<p className="p-4 text-sm text-slate-400">Cargando…</p>:filtered.map((c)=><button key={c.id} type="button" onClick={()=>{setSelectedId(c.id);router.replace(`/chat?conversation=${encodeURIComponent(c.id)}`)}} className={`w-full rounded-2xl px-3 py-3 text-left ${selectedId===c.id?'bg-cyan-300/10':'hover:bg-white/[.04]'}`}><p className="truncate text-sm font-bold">{c.display_name}</p><p className="truncate text-xs text-slate-400">{c.title||'Conversación'}</p></button>)}</div></aside><section className="flex min-h-[70vh] flex-col rounded-3xl border border-white/10 bg-white/[.03]"><div className="border-b border-white/10 p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-bold">{selected?.display_name||'Credi Chat'}</p><p className="text-xs text-slate-500">Mensajería privada</p></div><MessageCircle className="text-cyan-200"/></div></div><div ref={messageBox} className="flex-1 space-y-3 overflow-y-auto p-4">{messages.map((m)=><div key={m.id} className={`flex ${m.sender_id===userId?'justify-end':'justify-start'}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.sender_id===userId?'bg-cyan-300 text-slate-950':'bg-slate-900'}`}>{m.body&&<p className="whitespace-pre-wrap text-sm">{m.body}</p>}{m.metadata?.public_url&&<a href={String(m.metadata.public_url)} target="_blank" rel="noreferrer" className="mt-1 block text-xs underline">Abrir archivo</a>}</div></div>)}{error&&<p className="rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}</div><div className="border-t border-white/10 p-3"><div className="flex gap-2"><label className="flex size-11 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[.04]"><Paperclip size={18}/><input type="file" className="hidden" onChange={(e)=>{const f=e.target.files?.[0];if(f)void sendFile(f)}}/></label><textarea value={draft} onChange={(e)=>setDraft(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void sendText()}}} rows={1} placeholder="Escribe un mensaje…" className="min-h-11 flex-1 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm outline-none"/><button type="button" onClick={()=>void sendText()} disabled={sending||!draft.trim()} className="flex size-11 items-center justify-center rounded-xl bg-cyan-300 text-slate-950 disabled:opacity-40"><Send size={18}/></button></div>{uploading&&<p className="mt-2 text-xs text-cyan-200">Subiendo archivo…</p>}</div></section></div></main>
}
