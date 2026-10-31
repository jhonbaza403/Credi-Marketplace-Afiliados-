'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCheck, FileText, MessageCircle, Mic, Paperclip, Pin, Search, Send, Smile, Square, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CrediBusinessCall from '@/components/chat/CrediBusinessCall'
import { uploadCrediBusinessChatMedia } from '@/lib/storage/credibusiness-chat-media'
import type { ChatConversation, ChatMessage } from '@/types/chat'

type Profile = { id: string; full_name: string | null; avatar_url: string | null; role: string }
type RealtimePayload<T> = { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: T; old: Partial<T> | null }
type ConversationRow = { id: string; [key: string]: unknown }
type ContactRow = { id?: string; user_id?: string; [key: string]: unknown }
const QUICK = ['Consultar disponibilidad', 'Solicitar precio mayorista', 'Solicitar catálogo', 'Preguntar MOQ', 'Solicitar condiciones de envío', 'Preguntar tiempo de entrega', 'Solicitar factura', 'Negociar pedido', 'Solicitar cotización']
const EMOJIS = ['😀','😎','🔥','✅','📦','💼','💰','🚚','⭐','🎉','👏','🤝','👍','❤️','😂','😮','🙏']

function getMeta(message: ChatMessage) { return message.metadata as Record<string, unknown> }
function fmt(value: string) { return new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }
function fail(error: unknown, fallback: string) {
  const e = error as { message?: string; code?: string } | null
  if (e?.code === '42P17') return 'La política de seguridad del chat está desactualizada. Recarga la aplicación.'
  return e?.message?.trim() || fallback
}

export default function CrediBusinessChat() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const messageBox = useRef<HTMLDivElement>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const recordingStream = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(params.get('conversation'))
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [search, setSearch] = useState('')
  const [chatSearch, setChatSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [reply, setReply] = useState<ChatMessage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)
  const [context, setContext] = useState<Record<string, unknown> | null>(null)
  const [activeTab, setActiveTab] = useState<'Todos' | 'Grupos' | 'Canales' | 'Contactos'>('Todos')

  const refresh = useCallback(async () => {
    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!auth.user) { router.replace(`/login?next=${encodeURIComponent('/chat')}`); return null }
    setUserId(auth.user.id)
    const { data: memberships, error: membershipError } = await supabase.from('conversation_members').select('conversation_id,user_id,last_read_at,joined_at').eq('user_id', auth.user.id).order('joined_at', { ascending: false })
    if (membershipError) throw membershipError
    const ids = [...new Set((memberships ?? []).map((m: ChatMessage) => m.conversation_id))]
    if (!ids.length) { setConversations([]); return auth.user.id }
    const [{ data: rows, error: rowError }, { data: members, error: membersError }] = await Promise.all([
      supabase.from('conversations').select('id,kind,title,created_by,product_id,order_id,store_id,b2b_product_id,created_at,updated_at,metadata').in('id', ids).order('updated_at', { ascending: false }),
      supabase.from('conversation_members').select('conversation_id,user_id,last_read_at').in('conversation_id', ids),
    ])
    if (rowError) throw rowError
    if (membersError) throw membersError
    const memberIds = [...new Set((members ?? []).map((m: ContactRow) => m.user_id).filter((id: unknown): id is string => typeof id === 'string'))]
    const profileMap: Record<string, Profile> = {}
    if (memberIds.length) {
      const { data: people, error: peopleError } = await supabase.from('profiles').select('id,full_name,avatar_url,role').in('id', memberIds)
      if (peopleError) throw peopleError
      for (const person of people ?? []) profileMap[person.id] = person as Profile
    }
    setProfiles(profileMap)
    const mapped = (rows ?? []).map((row: ConversationRow) => {
      const ms = (members ?? []).filter((m: { conversation_id: string; user_id: string }) => m.conversation_id === row.id)
      const otherId = ms.find((m: { user_id: string }) => m.user_id !== auth.user!.id)?.user_id
      return { ...row, member_ids: ms.map((m: { user_id: string }) => m.user_id), display_name: row.title || (otherId ? profileMap[otherId]?.full_name : null) || 'Usuario Credi', unread: 0 } as ChatConversation
    })
    setConversations(mapped)
    setSelectedId((current) => current && mapped.some((c: ChatConversation) => c.id === current) ? current : mapped[0]?.id ?? null)
    return auth.user.id
  }, [router, supabase])

  const openBusinessContext = useCallback(async (currentUserId: string) => {
    if (selectedId) return
    const productId = params.get('product')
    const b2bProductId = params.get('b2bProduct')
    const target = params.get('to')
    const orderId = params.get('order')
    const country = params.get('country')
    const affiliateRef = params.get('ref')
    if (!productId && !b2bProductId && !target) return
    let targetUser = target
    let storeId: string | null = null
    let title = 'Nueva conversación comercial'
    const metadata: Record<string, unknown> = { source: 'credibusiness-chat', country, affiliate_ref: affiliateRef, order_id: orderId, operation_context: { productId, affiliateRef, orderId, source: 'chat' } }
    if (productId) {
      const { data: product, error: productError } = await supabase.from('products').select('id,title,store_id').eq('id', productId).maybeSingle()
      if (productError) throw productError
      if (!product) throw new Error('Producto no encontrado.')
      const { data: store, error: storeError } = await supabase.from('stores').select('id,store_name,vendor_id').eq('id', product.store_id).maybeSingle()
      if (storeError) throw storeError
      if (!store?.vendor_id) throw new Error('No hay proveedor disponible para este producto.')
      targetUser = store.vendor_id; storeId = store.id; title = `Consulta: ${product.title}`
      metadata.product_id = product.id; metadata.product_title = product.title; metadata.store_name = store.store_name
    }
    if (b2bProductId) {
      const { data: b2b, error: b2bError } = await supabase.from('b2b_products').select('id,title,supplier_id').eq('id', b2bProductId).maybeSingle()
      if (b2bError) throw b2bError
      if (!b2b?.supplier_id) throw new Error('No hay proveedor para esta oferta B2B.')
      targetUser = b2b.supplier_id; title = `B2B: ${b2b.title}`; metadata.b2b_product_id = b2b.id; metadata.b2b_title = b2b.title
    }
    if (!targetUser || targetUser === currentUserId) throw new Error('No se pudo determinar un destinatario válido.')
    const { data, error: rpcError } = await supabase.rpc('create_credichat_direct_conversation', { p_target_user_id: targetUser, p_product_id: productId, p_order_id: orderId, p_store_id: storeId, p_b2b_product_id: b2bProductId, p_title: title, p_metadata: metadata })
    if (rpcError) throw rpcError
    const id = String(data)
    if (!id || id === 'null') throw new Error('No fue posible crear la conversación comercial.')
    setContext(metadata)
    setSelectedId(id)
    router.replace(`/chat?conversation=${encodeURIComponent(id)}`)
    await refresh()
  }, [params, refresh, router, selectedId, supabase])

  const loadMessages = useCallback(async (conversationId: string) => {
    const [{ data, error: messageError }, { data: conversation }] = await Promise.all([
      supabase.from('messages').select('id,conversation_id,sender_id,message_type,body,reply_to_id,edited_at,deleted_at,metadata,created_at').eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(500),
      supabase.from('conversations').select('metadata,product_id,order_id,store_id,b2b_product_id').eq('id', conversationId).maybeSingle(),
    ])
    if (messageError) throw messageError
    if (conversation?.metadata) setContext(conversation.metadata as Record<string, unknown>)
    setMessages((data ?? []) as ChatMessage[])
    if (userId) await supabase.from('conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', conversationId).eq('user_id', userId)
    requestAnimationFrame(() => messageBox.current?.scrollTo({ top: messageBox.current.scrollHeight, behavior: 'smooth' }))
  }, [supabase, userId])

  useEffect(() => {
    let alive = true
    void refresh().then((id) => {
      if (id && alive) void openBusinessContext(id)
    }).catch((e) => {
      if (alive) setError(fail(e, 'No fue posible cargar Credi Business Chat.'))
    })
    return () => { alive = false }
  }, [openBusinessContext, refresh])

  useEffect(() => {
    if (!selectedId) return
    void loadMessages(selectedId).catch((e) => setError(fail(e, 'No fue posible cargar los mensajes.')))
    const channel = supabase.channel(`credibusiness-chat:${selectedId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedId}` }, (payload: RealtimePayload<ChatMessage>) => {
      const next = payload.new as ChatMessage
      if (payload.eventType === 'INSERT') setMessages((current) => current.some((m) => m.id === next.id) ? current : [...current, next])
      if (payload.eventType === 'UPDATE') setMessages((current) => current.map((m) => m.id === next.id ? next : m))
    }).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [loadMessages, selectedId, supabase])

  async function sendText(text = draft) {
    const body = text.trim()
    if (!selectedId || !userId || !body || busy) return
    setBusy(true)
    setError(null)
    try {
      const { data: inserted, error: insertError } = await supabase.from('messages').insert({ conversation_id: selectedId, sender_id: userId, message_type: 'text', body, reply_to_id: reply?.id ?? null, metadata: { business_context: context, forwarded: false } }).select('id,conversation_id,sender_id,message_type,body,reply_to_id,edited_at,deleted_at,metadata,created_at').single()
      if (insertError) throw insertError
      if (inserted) setMessages((current) => current.some((m) => m.id === inserted.id) ? current : [...current, inserted as ChatMessage])
      setDraft('')
      setReply(null)
      setEmojiOpen(false)
      requestAnimationFrame(() => messageBox.current?.scrollTo({ top: messageBox.current.scrollHeight, behavior: 'smooth' }))
    } catch (e) {
      setError(fail(e, 'No fue posible enviar el mensaje.'))
    } finally {
      setBusy(false)
    }
  }

  async function sendFile(file: File) {
    if (!selectedId || !userId || uploading) return
    setUploading(true)
    setError(null)
    try {
      const media = await uploadCrediBusinessChatMedia(file)
      const { data: message, error: messageError } = await supabase.from('messages').insert({ conversation_id: selectedId, sender_id: userId, message_type: media.kind, reply_to_id: reply?.id ?? null, metadata: { file_name: media.name, public_url: media.url, storage_path: media.path, mime_type: media.contentType, size_bytes: media.size, business_context: context } }).select('id,conversation_id,sender_id,message_type,body,reply_to_id,edited_at,deleted_at,metadata,created_at').single()
      if (messageError || !message) throw messageError ?? new Error('No fue posible crear el mensaje multimedia.')
      const { error: attachmentError } = await supabase.from('message_attachments').insert({ message_id: message.id, storage_path: media.path, public_url: media.url, file_name: media.name, mime_type: media.contentType, size_bytes: media.size })
      if (attachmentError) throw attachmentError
      setMessages((current) => current.some((m) => m.id === message.id) ? current : [...current, message as ChatMessage])
      setReply(null)
      setAttachOpen(false)
      requestAnimationFrame(() => messageBox.current?.scrollTo({ top: messageBox.current.scrollHeight, behavior: 'smooth' }))
    } catch (e) {
      setError(fail(e, 'No fue posible enviar el archivo.'))
    } finally {
      setUploading(false)
    }
  }

  function chooseRecordingMime() {
    if (typeof MediaRecorder === 'undefined') return null
    const candidates = [
      { mime: 'audio/webm;codecs=opus', extension: 'webm' },
      { mime: 'audio/webm', extension: 'webm' },
      { mime: 'audio/mp4', extension: 'm4a' },
      { mime: 'audio/ogg;codecs=opus', extension: 'ogg' },
      { mime: 'audio/ogg', extension: 'ogg' },
    ]
    return candidates.find(({ mime }) => MediaRecorder.isTypeSupported(mime)) ?? null
  }

  async function recordVoice() {
    if (!selectedId || !userId || uploading) return
    if (recording) {
      recorder.current?.stop()
      return
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('La grabación de voz requiere HTTPS y permiso para usar el micrófono.')
      return
    }
    const recordingFormat = chooseRecordingMime()
    if (!recordingFormat) {
      setError('Este navegador no dispone de un formato de grabación de voz compatible.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      const r = new MediaRecorder(stream, { mimeType: recordingFormat.mime })
      recordingStream.current = stream
      chunks.current = []
      r.ondataavailable = (event) => { if (event.data.size > 0) chunks.current.push(event.data) }
      r.onerror = () => {
        stream.getTracks().forEach((track) => track.stop())
        recordingStream.current = null
        recorder.current = null
        setRecording(false)
        setError('La grabación de voz se interrumpió inesperadamente.')
      }
      r.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        recordingStream.current = null
        recorder.current = null
        setRecording(false)
        const blob = new Blob(chunks.current, { type: recordingFormat.mime })
        chunks.current = []
        if (blob.size === 0) {
          setError('No se obtuvo audio de la grabación.')
          return
        }
        void sendFile(new File([blob], `nota-voz-${Date.now()}.${recordingFormat.extension}`, { type: recordingFormat.mime.split(';')[0] }))
      }
      recorder.current = r
      r.start(250)
      setRecording(true)
    } catch (e) {
      recordingStream.current?.getTracks().forEach((track) => track.stop())
      recordingStream.current = null
      recorder.current = null
      setRecording(false)
      setError(fail(e, 'No fue posible acceder al micrófono. Revisa el permiso del navegador.'))
    }
  }

  useEffect(() => () => {
    recorder.current?.stop()
    recordingStream.current?.getTracks().forEach((track) => track.stop())
  }, [])

  async function action(message: ChatMessage, type: 'react'|'copy'|'pin'|'delete'|'edit'|'forward') {
    if (!userId) return
    if (type === 'react') { const { error: e } = await supabase.from('message_reactions').upsert({ message_id: message.id, user_id: userId, reaction: '👍' }, { onConflict: 'message_id,user_id' }); if (e) setError(fail(e, 'No fue posible reaccionar.')); return }
    if (type === 'copy') { if (message.body) await navigator.clipboard.writeText(message.body); return }
    if (type === 'pin') { const { error: e } = await supabase.from('messages').update({ metadata: { ...message.metadata, pinned: !Boolean(message.metadata.pinned) } }).eq('id', message.id); if (e) setError(fail(e, 'No fue posible fijar el mensaje.')); return }
    if (type === 'delete') { if (message.sender_id !== userId) return; const { error: e } = await supabase.from('messages').update({ body: null, deleted_at: new Date().toISOString() }).eq('id', message.id).eq('sender_id', userId); if (e) setError(fail(e, 'No fue posible eliminar el mensaje.')); return }
    if (type === 'edit') { if (message.sender_id !== userId || !message.body) return; const next = window.prompt('Editar mensaje', message.body); if (!next?.trim()) return; const { error: e } = await supabase.from('messages').update({ body: next.trim(), edited_at: new Date().toISOString() }).eq('id', message.id).eq('sender_id', userId); if (e) setError(fail(e, 'No fue posible editar el mensaje.')); return }
    const target = window.prompt(`Reenviar a número de conversación:\n${conversations.map((c, i) => `${i + 1}. ${c.display_name}`).join('\\n')}`)
    const index = Number(target) - 1
    const destination = Number.isInteger(index) ? conversations[index] : null
    if (!destination) return
    const { error: e } = await supabase.from('messages').insert({ conversation_id: destination.id, sender_id: userId, message_type: message.message_type, body: message.body, metadata: { ...message.metadata, forwarded: true, forwarded_from: message.conversation_id } })
    if (e) setError(fail(e, 'No fue posible reenviar el mensaje.'))
  }

  const selected = conversations.find((c) => c.id === selectedId) ?? null
  const peerId = selected?.member_ids.find((id: string) => id !== userId) ?? null
  const peer = peerId ? profiles[peerId] : null
  const list = conversations.filter((c) => { const q = search.toLowerCase().trim(); const kind = String(c.kind || '').toLowerCase(); const tabMatch = activeTab === 'Todos' || (activeTab === 'Grupos' && kind.includes('group')) || (activeTab === 'Canales' && kind.includes('channel')) || (activeTab === 'Contactos' && !kind.includes('group') && !kind.includes('channel')); return tabMatch && (!q || c.display_name.toLowerCase().includes(q) || Boolean(c.title?.toLowerCase().includes(q))) })
  const shown = messages.filter((m) => !chatSearch.trim() || Boolean(m.body?.toLowerCase().includes(chatSearch.toLowerCase()))).slice(-500)

  const sharedMedia = messages.filter((m) => ['image', 'video', 'document', 'file'].includes(m.message_type)).slice(-6)
  const groupCount = conversations.filter((c) => String(c.kind || '').toLowerCase().includes('group')).length
  const channelCount = conversations.filter((c) => String(c.kind || '').toLowerCase().includes('channel')).length

  return (
    <main className="credi-business-chat credi-chat-page min-h-screen">
      <div className="mx-auto max-w-[1900px] px-2 py-2 sm:px-4">
        <header className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-cyan-300/15 bg-[#071a4a] px-4 py-3 shadow-[0_0_30px_rgba(0,112,255,.12)]">
          <a href="/marketplace" className="flex min-w-fit items-center gap-2 text-white" aria-label="Credi Marketplace">
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-700 text-xl">🛒</span>
            <span><strong className="block text-xl font-black tracking-tight">Credi</strong><small className="block text-[9px] text-blue-200">Compra · Vende · Conecta</small></span>
          </a>
          <div className="relative min-w-[180px] flex-1">
            <Search className="absolute left-3 top-3 size-4 text-blue-200/70"/>
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar en Credi Chat…" aria-label="Buscar conversaciones" className="w-full rounded-full border border-blue-200/20 bg-[#06143b] py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-blue-100/55 focus:border-cyan-300"/>
          </div>
          <div className="flex items-center gap-2">
            <a href="/account/notifications" aria-label="Notificaciones" title="Notificaciones" className="flex size-10 items-center justify-center rounded-full border border-cyan-300/30 bg-blue-950 text-cyan-100 hover:bg-blue-900">♧</a>
            <a href="/account" aria-label="Mi cuenta" title="Mi cuenta" className="flex size-10 items-center justify-center rounded-full border border-blue-200/20 bg-blue-950 text-white hover:bg-blue-900">⚙</a>
            <a href="/account?tab=plans" className="rounded-full bg-gradient-to-r from-violet-700 to-fuchsia-600 px-5 py-2.5 text-sm font-black text-white shadow-[0_0_18px_rgba(168,85,247,.35)]">👑 Premium</a>
          </div>
        </header>

        {error && <div role="alert" className="mb-3 flex items-center justify-between rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-100"><span>{error}</span><button type="button" onClick={()=>setError(null)} aria-label="Cerrar error"><X size={17}/></button></div>}

        <div className="chat-shell grid min-h-[calc(100vh-105px)] overflow-hidden rounded-[1.5rem] border border-violet-400/30 bg-[#050d29] shadow-[0_0_45px_rgba(30,64,175,.18)] xl:grid-cols-[300px_minmax(0,1fr)_270px]">
          <aside className="flex min-h-[360px] flex-col border-b border-blue-200/10 bg-[#071332] xl:border-b-0 xl:border-r">
            <div className="border-b border-blue-200/10 px-4 pb-3 pt-4">
              <div className="mb-4 flex items-center justify-between"><h1 className="text-lg font-black text-white">Mensajes</h1><span className="rounded-full bg-violet-600/20 px-2.5 py-1 text-xs font-bold text-violet-200">{conversations.length}</span></div>
              <div className="flex gap-1 overflow-x-auto">
                {(['Todos','Grupos','Canales','Contactos'] as const).map((tab)=><button key={tab} type="button" onClick={()=>setActiveTab(tab)} className={`shrink-0 rounded-lg px-2.5 py-2 text-[11px] font-bold transition ${activeTab===tab?'bg-violet-700 text-white shadow-[0_0_14px_rgba(139,92,246,.45)]':'text-blue-100/70 hover:bg-blue-900/70'}`}>{tab}{tab==='Todos'?<span className="ml-1 text-cyan-200">{conversations.length}</span>:tab==='Grupos'?<span className="ml-1">{groupCount}</span>:tab==='Canales'?<span className="ml-1">{channelCount}</span>:null}</button>)}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {list.length ? list.map((c)=>{
                const id=c.member_ids.find((memberId)=>memberId!==userId)
                const person=id?profiles[id]:null
                return <button key={c.id} type="button" onClick={()=>{setSelectedId(c.id);router.replace(`/chat?conversation=${encodeURIComponent(c.id)}`)}} className={`flex w-full items-center gap-3 border-b border-blue-100/[.06] px-4 py-3 text-left transition hover:bg-blue-900/50 ${selectedId===c.id?'bg-gradient-to-r from-violet-800/70 to-blue-900/50':''}`}>
                  <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-cyan-300/70 bg-gradient-to-br from-blue-500 to-violet-700 text-sm font-black text-white">{person?.avatar_url?<img src={person.avatar_url} alt="" className="size-full object-cover"/>:c.display_name.slice(0,1).toUpperCase()}<span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-[#071332] bg-emerald-400"/></div>
                  <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><strong className="truncate text-sm text-white">{c.display_name}</strong><time className="shrink-0 text-[10px] text-blue-200/60">{new Date(c.updated_at).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})}</time></span><span className="mt-1 block truncate text-xs text-blue-100/65">{c.title||'Conversación Credi'}</span></span>
                </button>
              }):<div className="p-5 text-sm leading-6 text-blue-100/60">{conversations.length?'No hay conversaciones en esta categoría.':'Todavía no tienes conversaciones. Contacta desde un producto o busca a una persona en Credi.'}</div>}
            </div>
            <div className="border-t border-blue-200/10 p-3"><p className="text-[10px] font-bold uppercase tracking-widest text-cyan-200/70">Conectado a Credi</p><p className="mt-1 text-xs text-blue-100/60">Mensajería privada · sincronización en tiempo real</p></div>
          </aside>

          <section className="chat-panel flex min-h-[620px] min-w-0 flex-col bg-[#06143a]">
            <div className="border-b border-blue-200/10 bg-[#08183f] px-4 py-3 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-cyan-300/70 bg-gradient-to-br from-cyan-500 to-violet-700 font-black text-white">{peer?.avatar_url?<img src={peer.avatar_url} alt="" className="size-full object-cover"/>:selected?.display_name.slice(0,1).toUpperCase()||'C'}</div>
                  <div className="min-w-0"><p className="truncate text-base font-black text-white">{selected?.display_name||'Credi Chat'}</p><p className="text-xs text-emerald-300">{selected?'● En línea / canal privado':'Selecciona una conversación'}</p></div>
                </div>
                {selected&&<div className="shrink-0"><CrediBusinessCall conversationId={selectedId} peerUserId={peerId} peerName={selected.display_name||'Contacto comercial'}/></div>}
              </div>
              {selected&&context&&<div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 rounded-xl border border-cyan-300/15 bg-cyan-300/[.04] px-3 py-2 text-[11px] text-blue-100/80"><span><b className="text-cyan-200">Contexto:</b> {String(context.product_title||context.b2b_title||context.product_id||context.b2b_product_id||'Conversación directa')}</span><span><b className="text-cyan-200">Tienda:</b> {String(context.store_name||'—')}</span><span><b className="text-cyan-200">Pedido:</b> {String(context.order_id||'—')}</span></div>}
            </div>

            <div ref={messageBox} className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(ellipse_at_top,rgba(30,64,175,.17),transparent_55%)] px-3 py-5 sm:px-6">
              {!selected?<div className="flex min-h-[440px] items-center justify-center text-center"><div><MessageCircle className="mx-auto size-14 text-cyan-300"/><h2 className="mt-4 text-xl font-black text-white">Bienvenido a Credi Chat</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-blue-100/60">Tus conversaciones, llamadas, archivos y contactos en un solo lugar.</p></div></div>:shown.map((m)=><div key={m.id} className={`flex ${m.sender_id===userId?'justify-end':'justify-start'}`}><div className="max-w-[90%] sm:max-w-[78%]">
                <div className={`group relative rounded-2xl px-4 py-3 shadow-lg ${m.sender_id===userId?'rounded-br-md border border-cyan-300/25 bg-gradient-to-br from-blue-700 to-blue-600 text-white':'rounded-bl-md border border-blue-200/10 bg-[#14244d] text-blue-50'}`}>
                  {Boolean(m.metadata.pinned)&&<div className="mb-2 flex items-center gap-1 text-[10px] font-black text-cyan-200"><Pin size={11}/> Mensaje fijado</div>}
                  {m.reply_to_id&&<div className="mb-2 rounded-lg bg-black/20 px-3 py-2 text-[11px] text-blue-100/80">Respuesta · {messages.find((x)=>x.id===m.reply_to_id)?.body||'Contenido multimedia'}</div>}
                  {m.deleted_at?<p className="text-sm italic opacity-60">Mensaje eliminado</p>:<>{(()=>{const meta=getMeta(m);const url=typeof meta.public_url==='string'?meta.public_url:null;return <>{m.message_type==='image'&&url&&<img src={url} alt={String(meta.file_name||'Imagen')} className="mb-2 max-h-80 rounded-xl object-cover"/>}{m.message_type==='video'&&url&&<video src={url} controls playsInline className="mb-2 max-h-96 w-full rounded-xl"/>}{m.message_type==='audio'&&url&&<audio src={url} controls className="mb-2 w-full"/>}{(m.message_type==='document'||m.message_type==='file')&&url&&<a href={url} target="_blank" rel="noreferrer" className="mb-2 flex items-center gap-2 rounded-xl bg-black/10 p-3 text-sm font-bold underline"><FileText size={17}/>{String(meta.file_name||'Abrir archivo')}</a>}</>})()}{m.body&&<p className="whitespace-pre-wrap text-sm leading-6">{m.body}</p>}<div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-blue-100/60">{m.edited_at&&<span>editado</span>}<span>{fmt(m.created_at)}</span>{m.sender_id===userId&&<CheckCheck size={13}/>}</div></>}
                </div>
                <div className="mt-1 flex flex-wrap gap-1 opacity-70 transition sm:opacity-0 sm:group-hover:opacity-100">{([['react','👍'],['copy','Copiar'],['pin','Fijar'],['edit','Editar'],['delete','Eliminar'],['forward','Reenviar']] as const).map(([type,label])=><button key={type} type="button" onClick={()=>void action(m,type)} className="rounded-lg border border-blue-200/10 bg-[#071332] px-2 py-1 text-[10px] text-blue-100 hover:border-cyan-300/40">{label}</button>)}<button type="button" onClick={()=>setReply(m)} className="rounded-lg border border-blue-200/10 bg-[#071332] px-2 py-1 text-[10px] text-blue-100 hover:border-cyan-300/40">Responder</button></div>
              </div></div>)}
            </div>

            {reply&&<div className="border-t border-blue-200/10 bg-[#08183f] px-4 py-3 text-xs text-blue-100">Respondiendo a: <strong>{reply.body||'Contenido multimedia'}</strong><button type="button" onClick={()=>setReply(null)} className="ml-3 text-cyan-300">Cancelar</button></div>}
            <div className="border-t border-blue-200/10 bg-[#08183f] p-3 sm:p-4">
              {selected&&<div className="mb-2 flex gap-2 overflow-x-auto pb-1">{QUICK.slice(0,4).map((q)=><button key={q} type="button" onClick={()=>void sendText(q)} className="shrink-0 rounded-full border border-blue-200/15 bg-blue-950/70 px-3 py-1.5 text-[10px] font-bold text-blue-100/80 hover:border-cyan-300/40">{q}</button>)}</div>}
              <div className="flex items-end gap-2">
                <div className="relative"><button type="button" onClick={()=>setEmojiOpen((v)=>!v)} aria-label="Emojis" className="flex size-11 items-center justify-center rounded-full border border-violet-300/25 bg-blue-950 text-violet-200"><Smile size={19}/></button>{emojiOpen&&<div className="absolute bottom-14 left-0 z-20 grid w-72 grid-cols-9 gap-1 rounded-2xl border border-violet-300/20 bg-[#071332] p-3 shadow-2xl">{EMOJIS.map((emoji)=><button key={emoji} type="button" onClick={()=>setDraft((d)=>d+emoji)} className="rounded-lg p-2 text-lg hover:bg-blue-900">{emoji}</button>)}</div>}</div>
                <div className="relative"><button type="button" onClick={()=>setAttachOpen((v)=>!v)} aria-label="Adjuntar archivo" className="flex size-11 items-center justify-center rounded-full border border-violet-300/25 bg-blue-950 text-violet-200"><Paperclip size={19}/></button>{attachOpen&&<div className="absolute bottom-14 left-0 z-20 w-60 rounded-2xl border border-violet-300/20 bg-[#071332] p-2 shadow-2xl"><label className="flex cursor-pointer items-center gap-2 rounded-xl p-3 text-sm text-blue-50 hover:bg-blue-900"><FileText size={17}/> Archivo<input type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" className="hidden" onChange={(e)=>{const f=e.target.files?.[0];e.currentTarget.value='';if(f)void sendFile(f)}}/></label></div>}</div>
                <button type="button" onClick={()=>void recordVoice()} disabled={!selectedId||uploading} aria-label={recording?'Detener grabación':'Grabar nota de voz'} className={`flex size-11 items-center justify-center rounded-full border border-violet-300/25 ${recording?'bg-rose-500/20 text-rose-200':'bg-blue-950 text-violet-200'} disabled:opacity-40`}>{recording?<Square size={17}/>:<Mic size={19}/>}</button>
                <textarea value={draft} onChange={(e)=>setDraft(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(selectedId)void sendText()}}} disabled={busy||!selectedId} placeholder="Escribe un mensaje…" rows={1} className="min-h-11 flex-1 resize-none rounded-2xl border border-blue-200/15 bg-[#061332] px-4 py-3 text-sm text-white outline-none placeholder:text-blue-100/40 focus:border-cyan-300"/>
                <button type="button" onClick={()=>void sendText()} disabled={!draft.trim()||busy||!selectedId} aria-label="Enviar mensaje" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-[0_0_20px_rgba(124,58,237,.5)] disabled:opacity-40"><Send size={18}/></button>
              </div>
              {uploading&&<p className="mt-2 text-[11px] text-cyan-200">Procesando archivo o nota de voz…</p>}{recording&&<p className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-rose-300"><span className="size-2 animate-pulse rounded-full bg-rose-400"/> Grabando nota de voz</p>}
            </div>
          </section>

          <aside className="hidden flex-col border-l border-blue-200/10 bg-[#071332] xl:flex">
            <div className="flex items-center justify-between border-b border-blue-200/10 px-4 py-4"><h2 className="text-sm font-black text-white">Info. del chat</h2><span className="text-blue-100/40">⋮</span></div>
            <div className="border-b border-blue-200/10 px-4 py-6 text-center">
              <div className="mx-auto flex size-28 items-center justify-center overflow-hidden rounded-full border-4 border-cyan-300/70 bg-gradient-to-br from-blue-600 to-violet-700 text-3xl font-black text-white shadow-[0_0_35px_rgba(34,211,238,.25)]">{peer?.avatar_url?<img src={peer.avatar_url} alt="" className="size-full object-cover"/>:selected?.display_name.slice(0,1).toUpperCase()||'🛒'}</div>
              <h3 className="mt-4 text-lg font-black text-white">{selected?.display_name||'Soporte Credi'}</h3>
              <p className="mt-1 text-xs text-cyan-200">{peer?.role||'Centro de comunicación Credi'}</p>
              <p className="mt-3 text-xs leading-5 text-blue-100/60">{selected?.title||'Conecta con compradores, vendedores, proveedores y la comunidad Credi.'}</p>
            </div>
            <div className="border-b border-blue-200/10 px-4 py-4">
              <h3 className="mb-3 text-xs font-black text-white">Funciones disponibles</h3>
              <ul className="space-y-2 text-xs text-blue-100/75"><li>✓ Mensajes en tiempo real</li><li>✓ Llamadas de voz y vídeo</li><li>✓ Notas de voz y archivos</li><li>✓ Respuestas, reacciones y reenvíos</li><li>✓ Conversaciones vinculadas a pedidos</li></ul>
            </div>
            <div className="min-h-0 flex-1 px-4 py-4">
              <div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-black text-white">Multimedia</h3><span className="text-[10px] text-blue-100/50">{sharedMedia.length} recientes</span></div>
              <div className="grid grid-cols-3 gap-2">{sharedMedia.map((m)=>{const meta=getMeta(m);const url=typeof meta.public_url==='string'?meta.public_url:null;return <div key={m.id} className="aspect-square overflow-hidden rounded-lg border border-blue-200/10 bg-blue-950">{m.message_type==='image'&&url?<img src={url} alt={String(meta.file_name||'Imagen compartida')} className="size-full object-cover"/>:m.message_type==='video'&&url?<video src={url} className="size-full object-cover"/>:<div className="flex size-full items-center justify-center text-cyan-200"><FileText size={22}/></div>}</div>})}</div>
              {!sharedMedia.length&&<p className="text-xs text-blue-100/45">Los archivos compartidos aparecerán aquí.</p>}
            </div>
            <div className="border-t border-blue-200/10 p-4 text-[10px] text-blue-100/45">Credi Chat · Privacidad y controles de cuenta</div>
          </aside>
        </div>
      </div>
    </main>
  )
}
