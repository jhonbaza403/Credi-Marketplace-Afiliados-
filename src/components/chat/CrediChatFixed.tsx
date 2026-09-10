'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Check,
  CheckCheck,
  Copy,
  FileText,
  Forward,
  MessageCircle,
  Mic,
  Paperclip,
  Pin,
  Play,
  Search,
  Send,
  Smile,
  Square,
  Trash2,
  Video,
  Phone,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uploadCrediBusinessChatMedia } from '@/lib/storage/credibusiness-chat-media'
import CrediBusinessCall from '@/components/chat/CrediBusinessCall'
import type { ChatConversation, ChatMessage } from '@/types/chat'

type Profile = { id: string; full_name: string | null; avatar_url: string | null; role: string }
type MemberRow = { conversation_id: string; user_id: string; last_read_at: string | null; joined_at?: string }
const QUICK_ACTIONS = [
  'Consultar disponibilidad',
  'Solicitar precio mayorista',
  'Solicitar catálogo',
  'Preguntar MOQ',
  'Solicitar condiciones de envío',
  'Preguntar tiempo de entrega',
  'Solicitar factura',
  'Negociar pedido',
  'Solicitar cotización',
]
const EMOJIS = ['😀', '😎', '🔥', '✅', '📦', '💼', '💰', '🚚', '⭐', '🎉', '👏', '🤝', '👍', '❤️', '😂', '😮', '🙏']

type ContextInfo = {
  product?: string | null
  productTitle?: string | null
  store?: string | null
  order?: string | null
  country?: string | null
  affiliateRef?: string | null
  b2bProduct?: string | null
  b2bTitle?: string | null
}

function errorMessage(error: unknown, fallback: string) {
  const value = error as { message?: string; code?: string } | null
  if (value?.code === '42P17') return 'La configuración de seguridad de Credi Chat necesita actualizarse. Recarga la aplicación.'
  return typeof value?.message === 'string' && value.message.trim() ? value.message : fallback
}

function time(value: string) {
  return new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short' }).format(new Date(value))
}

function fileMeta(message: ChatMessage) {
  return message.metadata as Record<string, unknown>
}

export default function CrediChatFixed() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const messageBox = useRef<HTMLDivElement>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const recordingChunks = useRef<Blob[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(params.get('conversation'))
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [chatSearch, setChatSearch] = useState('')
  const [context, setContext] = useState<ContextInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null)

  const loadConversations = useCallback(async () => {
    setError(null)
    setLoading(true)
    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!auth.user) {
      router.replace(`/login?next=${encodeURIComponent('/chat')}`)
      return null
    }
    const currentUserId = auth.user.id
    setUserId(currentUserId)
    const { data: memberships, error: memberError } = await supabase
      .from('conversation_members')
      .select('conversation_id,user_id,last_read_at,joined_at')
      .eq('user_id', currentUserId)
      .order('joined_at', { ascending: false })
    if (memberError) throw memberError
    const ids = [...new Set((memberships ?? []).map((row) => row.conversation_id))]
    if (!ids.length) {
      setConversations([])
      setMessages([])
      setLoading(false)
      return currentUserId
    }
    const [{ data: rows, error: conversationError }, { data: allMembers, error: allMemberError }] = await Promise.all([
      supabase.from('conversations').select('id,kind,title,created_by,product_id,order_id,store_id,b2b_product_id,created_at,updated_at').in('id', ids).order('updated_at', { ascending: false }),
      supabase.from('conversation_members').select('conversation_id,user_id,last_read_at').in('conversation_id', ids),
    ])
    if (conversationError) throw conversationError
    if (allMemberError) throw allMemberError
    const memberIds = [...new Set((allMembers ?? []).map((row) => row.user_id))]
    const profileMap: Record<string, Profile> = {}
    if (memberIds.length) {
      const { data, error: profileError } = await supabase.from('profiles').select('id,full_name,avatar_url,role').in('id', memberIds)
      if (profileError) throw profileError
      for (const row of data ?? []) profileMap[row.id] = row as Profile
    }
    setProfiles(profileMap)
    const mapped = (rows ?? []).map((row) => {
      const members = (allMembers ?? []).filter((member) => member.conversation_id === row.id)
      const otherId = members.find((member) => member.user_id !== currentUserId)?.user_id
      const mine = members.find((member) => member.user_id === currentUserId)
      const other = otherId ? profileMap[otherId] : undefined
      const unread = mine?.last_read_at ? 0 : 0
      return { ...row, member_ids: members.map((member) => member.user_id), display_name: row.title || other?.full_name || 'Usuario Credi', unread } as ChatConversation
    })
    setConversations(mapped)
    setSelectedId((current) => current && mapped.some((item) => item.id === current) ? current : mapped[0]?.id ?? null)
    setLoading(false)
    return currentUserId
  }, [router, supabase])

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data, error: messageError } = await supabase
      .from('messages')
      .select('id,conversation_id,sender_id,message_type,body,reply_to_id,edited_at,deleted_at,metadata,created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(500)
    if (messageError) throw messageError
    setMessages((data ?? []) as ChatMessage[])
    if (userId) await supabase.from('conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', conversationId).eq('user_id', userId)
    requestAnimationFrame(() => messageBox.current?.scrollTo({ top: messageBox.current.scrollHeight, behavior: 'smooth' }))
  }, [supabase, userId])

  const openContext = useCallback(async (currentUserId: string) => {
    const productId = params.get('product')
    const b2bProductId = params.get('b2bProduct')
    const targetUserIdParam = params.get('to')
    const orderId = params.get('order')
    const country = params.get('country')
    const affiliateRef = params.get('ref')
    if (selectedId || (!productId && !b2bProductId && !targetUserIdParam)) return
    let targetUserId = targetUserIdParam
    let title = 'Nueva conversación comercial'
    let storeId: string | null = null
    let contextInfo: ContextInfo = { product: productId, b2bProduct: b2bProductId, order: orderId, country, affiliateRef }
    if (productId) {
      const { data: product, error: productError } = await supabase.from('products').select('id,title,store_id').eq('id', productId).maybeSingle()
      if (productError) throw productError
      if (!product) throw new Error('Producto no encontrado.')
      const { data: store, error: storeError } = await supabase.from('stores').select('id,store_name,vendor_id').eq('id', product.store_id).maybeSingle()
      if (storeError) throw storeError
      if (!store?.vendor_id) throw new Error('El producto no tiene proveedor disponible.')
      targetUserId = store.vendor_id
      storeId = store.id
      title = `Consulta: ${product.title}`
      contextInfo = { ...contextInfo, productTitle: product.title, store: store.store_name }
    }
    if (b2bProductId) {
      const { data: b2b, error: b2bError } = await supabase.from('b2b_products').select('id,title,supplier_id').eq('id', b2bProductId).maybeSingle()
      if (b2bError) throw b2bError
      if (!b2b?.supplier_id) throw new Error('La oferta B2B no tiene proveedor disponible.')
      targetUserId = b2b.supplier_id
      title = `B2B: ${b2b.title}`
      contextInfo = { ...contextInfo, b2bTitle: b2b.title }
    }
    if (!targetUserId) throw new Error('No se pudo determinar el destinatario comercial.')
    if (targetUserId === currentUserId) throw new Error('No puedes abrir una conversación contigo mismo.')
    const { data: conversationId, error: rpcError } = await supabase.rpc('create_credichat_direct_conversation', {
      p_target_user_id: targetUserId,
      p_product_id: productId,
      p_order_id: orderId,
      p_store_id: storeId,
      p_b2b_product_id: b2bProductId,
      p_title: title,
      p_metadata: { source: 'credibusiness-chat', ...contextInfo },
    })
    if (rpcError) throw rpcError
    setContext(contextInfo)
    setSelectedId(String(conversationId))
    router.replace(`/chat?conversation=${encodeURIComponent(String(conversationId))}`)
    await loadConversations()
  }, [loadConversations, params, router, selectedId, supabase])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const current = await loadConversations()
        if (active && current) await openContext(current)
      } catch (cause) {
        if (active) setError(errorMessage(cause, 'No fue posible cargar Credi Business Chat.'))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [loadConversations, openContext])

  useEffect(() => {
    if (!selectedId) return
    void loadMessages(selectedId).catch((cause) => setError(errorMessage(cause, 'No fue posible cargar los mensajes.')))
    const channel = supabase.channel(`credibusiness-chat:${selectedId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedId}` }, (payload) => {
        const next = payload.new as ChatMessage
        setMessages((current) => current.some((message) => message.id === next.id) ? current : [...current, next])
        requestAnimationFrame(() => messageBox.current?.scrollTo({ top: messageBox.current.scrollHeight, behavior: 'smooth' }))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedId}` }, (payload) => {
        const next = payload.new as ChatMessage
        setMessages((current) => current.map((message) => message.id === next.id ? next : message))
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [loadMessages, selectedId, supabase])

  async function sendText(bodyOverride?: string) {
    const body = (bodyOverride ?? draft).trim()
    if (!body || !selectedId || !userId || sending) return
    setSending(true)
    setError(null)
    try {
      const { error: insertError } = await supabase.from('messages').insert({
        conversation_id: selectedId,
        sender_id: userId,
        message_type: 'text',
        body,
        reply_to_id: replyTo?.id ?? null,
        metadata: { business_context: context },
      })
      if (insertError) throw insertError
      setDraft('')
      setReplyTo(null)
      setEmojiOpen(false)
    } catch (cause) {
      setError(errorMessage(cause, 'No fue posible enviar el mensaje.'))
    } finally { setSending(false) }
  }

  async function sendFile(file: File) {
    if (!selectedId || !userId || uploading) return
    setUploading(true)
    setError(null)
    try {
      const media = await uploadCrediBusinessChatMedia(file)
      const { data: message, error: messageError } = await supabase.from('messages').insert({
        conversation_id: selectedId,
        sender_id: userId,
        message_type: media.kind === 'image' ? 'image' : media.kind === 'video' ? 'video' : media.kind === 'audio' ? 'audio' : media.kind === 'document' ? 'document' : 'file',
        reply_to_id: replyTo?.id ?? null,
        metadata: { file_name: media.name, public_url: media.url, storage_path: media.path, mime_type: media.contentType, size_bytes: media.size, business_context: context },
      }).select('id').single()
      if (messageError || !message) throw messageError ?? new Error('No fue posible crear el mensaje multimedia.')
      const { error: attachmentError } = await supabase.from('message_attachments').insert({ message_id: message.id, storage_path: media.path, public_url: media.url, file_name: media.name, mime_type: media.contentType, size_bytes: media.size })
      if (attachmentError) throw attachmentError
      setReplyTo(null)
    } catch (cause) {
      setError(errorMessage(cause, 'No fue posible enviar el archivo.'))
    } finally { setUploading(false) }
  }

  async function startRecording() {
    if (!selectedId || !userId || recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      recordingChunks.current = []
      mediaRecorder.ondataavailable = (event) => { if (event.data.size) recordingChunks.current.push(event.data) }
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const file = new File([new Blob(recordingChunks.current, { type: mimeType })], `nota-de-voz-${Date.now()}.${mimeType.includes('mp4') ? 'm4a' : 'webm'}`, { type: mimeType })
        void sendFile(file)
      }
      recorder.current = mediaRecorder
      mediaRecorder.start()
      setRecording(true)
    } catch (cause) {
      setError(errorMessage(cause, 'No fue posible iniciar la nota de voz. Revisa el permiso del micrófono.'))
    }
  }

  function stopRecording() {
    recorder.current?.stop()
    recorder.current = null
    setRecording(false)
  }

  async function react(messageId: string, reaction: string) {
    if (!userId) return
    const { error: reactionError } = await supabase.from('message_reactions').upsert({ message_id: messageId, user_id: userId, reaction }, { onConflict: 'message_id,user_id' })
    if (reactionError) setError(errorMessage(reactionError, 'No fue posible registrar la reacción.'))
  }

  async function updateMessage(message: ChatMessage, body: string | null, deleted = false) {
    if (!userId || message.sender_id !== userId) return
    const { error: updateError } = await supabase.from('messages').update({ body: deleted ? null : body, edited_at: deleted ? message.edited_at : new Date().toISOString(), deleted_at: deleted ? new Date().toISOString() : null }).eq('id', message.id).eq('sender_id', userId)
    if (updateError) setError(errorMessage(updateError, 'No fue posible actualizar el mensaje.'))
  }

  async function togglePin(message: ChatMessage) {
    const metadata = { ...message.metadata, pinned: !Boolean(message.metadata.pinned) }
    const { error: pinError } = await supabase.from('messages').update({ metadata }).eq('id', message.id)
    if (pinError) setError(errorMessage(pinError, 'No fue posible fijar el mensaje.'))
  }

  async function forwardMessage(message: ChatMessage) {
    if (!userId || conversations.length < 2) {
      setError('Necesitas al menos otra conversación para reenviar el mensaje.')
      return
    }
    const target = window.prompt(`Escribe el número de conversación destino:\n${conversations.map((item, index) => `${index + 1}. ${item.display_name}`).join('\n')}`)
    const index = Number(target) - 1
    const targetConversation = Number.isInteger(index) ? conversations[index] : null
    if (!targetConversation) return
    const { error: forwardError } = await supabase.from('messages').insert({ conversation_id: targetConversation.id, sender_id: userId, message_type: message.message_type, body: message.body, metadata: { ...message.metadata, forwarded: true, forwarded_from: message.conversation_id } })
    if (forwardError) setError(errorMessage(forwardError, 'No fue posible reenviar el mensaje.'))
  }

  async function copyMessage(message: ChatMessage) {
    if (!message.body) return
    await navigator.clipboard.writeText(message.body)
  }

  const selected = conversations.find((item) => item.id === selectedId) ?? null
  const peerId = selected?.member_ids.find((id) => id !== userId) ?? null
  const peer = peerId ? profiles[peerId] : null
  const visibleMessages = messages.filter((message) => {
    const q = chatSearch.trim().toLowerCase()
    return !q || message.body?.toLowerCase().includes(q)
  })
  const filteredConversations = conversations.filter((item) => {
    const q = search.trim().toLowerCase()
    return !q || item.display_name.toLowerCase().includes(q) || item.title?.toLowerCase().includes(q)
  })
  const hasBusinessContext = Boolean(context?.product || context?.b2bProduct || context?.order || context?.store)

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#050816] text-white">
      <div className="mx-auto max-w-[1500px] px-3 py-4 sm:px-6 sm:py-7">
        <header className="mb-4 rounded-[1.75rem] border border-cyan-300/10 bg-[#08101f] p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200"><MessageCircle size={22} /></span><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Credi Business Chat</p><h1 className="text-2xl font-black sm:text-3xl">Tu canal oficial de comunicación comercial</h1></div></div>
            <span className="rounded-full border border-emerald-400/15 bg-emerald-400/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-200">● Tiempo real</span>
          </div>
          <p className="mt-3 max-w-5xl text-sm leading-6 text-slate-300">Mensajería privada y empresarial vinculada al producto, tienda, usuario, país, pedido y referencia comercial; con texto, multimedia, notas de voz, documentos, reacciones y llamadas.</p>
        </header>

        {error && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100"><span>{error}</span><button type="button" onClick={() => setError(null)} aria-label="Cerrar"><X size={17} /></button></div>}

        <div className="grid min-h-[720px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[.03] shadow-2xl lg:grid-cols-[330px_1fr]">
          <aside className="border-b border-white/10 bg-slate-950/60 lg:border-b-0 lg:border-r">
            <div className="border-b border-white/10 p-4"><div className="relative"><Search className="absolute left-3 top-3.5 size-4 text-slate-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar conversaciones" className="w-full rounded-xl border border-white/10 bg-white/[.04] py-3 pl-9 pr-3 text-sm outline-none placeholder:text-slate-500" /></div></div>
            <div className="max-h-[640px] overflow-y-auto">
              {loading ? <div className="p-6 text-sm text-slate-400">Cargando Credi Business Chat…</div> : filteredConversations.length ? filteredConversations.map((item) => <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); router.replace(`/chat?conversation=${encodeURIComponent(item.id)}`) }} className={`w-full border-b border-white/5 px-4 py-4 text-left transition hover:bg-white/[.04] ${selectedId === item.id ? 'bg-cyan-300/[.08]' : ''}`}><div className="flex items-center gap-3"><div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300/20 to-violet-400/20 text-xs font-black text-cyan-100">{item.display_name.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-black">{item.display_name}</p><span className="text-[10px] text-slate-500">{dateLabel(item.updated_at)}</span></div><p className="mt-1 truncate text-xs text-slate-400">{item.title || 'Conversación comercial'}</p></div></div></button>) : <div className="p-6 text-sm leading-6 text-slate-400">No tienes conversaciones. Entra desde un producto y pulsa “Contactar al proveedor” para crear una.</div>}
            </div>
          </aside>

          <section className="flex min-h-[720px] flex-col">
            <div className="border-b border-white/10 bg-slate-950/50 px-4 py-3 sm:px-5">
              <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-100">{selected?.display_name.slice(0, 1).toUpperCase() || 'C'}</div><div className="min-w-0"><p className="truncate text-sm font-black">{selected?.display_name || 'Selecciona una conversación'}</p><p className="truncate text-xs text-slate-400">{peer?.role ? `${peer.role} · Credi Marketplace` : 'Canal comercial'}</p></div></div><CrediBusinessCall conversationId={selectedId} peerUserId={peerId} peerName={selected?.display_name || 'Contacto comercial'} /></div>
              {hasBusinessContext && <div className="mt-3 grid gap-2 rounded-2xl border border-cyan-300/10 bg-cyan-300/[.04] p-3 text-xs sm:grid-cols-2 lg:grid-cols-4"><div><span className="font-black text-cyan-200">Producto</span><p className="mt-1 text-slate-300">{context?.productTitle || context?.b2bTitle || context?.product || context?.b2bProduct || '—'}</p></div><div><span className="font-black text-cyan-200">Empresa / tienda</span><p className="mt-1 text-slate-300">{context?.store || '—'}</p></div><div><span className="font-black text-cyan-200">Pedido / destino</span><p className="mt-1 text-slate-300">{context?.order || context?.country || '—'}</p></div><div><span className="font-black text-cyan-200">Afiliado</span><p className="mt-1 text-slate-300">{context?.affiliateRef || '—'}</p></div></div>}
              {selected && <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">{QUICK_ACTIONS.map((action) => <button key={action} type="button" onClick={() => void sendText(action)} className="shrink-0 rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-[11px] font-bold text-slate-200 hover:bg-white/[.08]">{action}</button>)}</div>}
              {selected && <div className="mt-3 relative"><Search className="absolute left-3 top-2.5 size-4 text-slate-500" /><input value={chatSearch} onChange={(event) => setChatSearch(event.target.value)} placeholder="Buscar dentro del chat" className="w-full rounded-xl border border-white/10 bg-white/[.03] py-2 pl-9 pr-3 text-xs outline-none placeholder:text-slate-500" /></div>}
            </div>

            <div ref={messageBox} className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(34,211,238,.06),transparent_35%)] px-3 py-5 sm:px-6">
              {!selected ? <div className="flex min-h-[500px] items-center justify-center text-center"><div><MessageCircle className="mx-auto size-16 text-cyan-200" /><h2 className="mt-5 text-xl font-black">Tu centro de comunicación comercial</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">Relaciona cada conversación con el negocio que la originó y mantén toda la negociación dentro de Credi Marketplace.</p></div></div> : visibleMessages.map((message) => {
                const mine = message.sender_id === userId
                const meta = fileMeta(message)
                const url = typeof meta.public_url === 'string' ? meta.public_url : null
                const pinned = Boolean(meta.pinned)
                const reply = message.reply_to_id ? messages.find((item) => item.id === message.reply_to_id) : null
                return <div key={message.id} className={`group flex ${mine ? 'justify-end' : 'justify-start'}`} onMouseLeave={() => setSelectedMessage(null)}><div className={`relative max-w-[92%] rounded-2xl px-4 py-3 shadow-lg sm:max-w-[78%] ${mine ? 'bg-cyan-300 text-slate-950' : 'bg-slate-900/95 text-white'}`}>
                  {pinned && <div className="mb-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest opacity-60"><Pin size={11} /> Fijado</div>}
                  {reply && !message.deleted_at && <div className={`mb-2 rounded-xl px-3 py-2 text-[11px] ${mine ? 'bg-slate-950/10' : 'bg-white/5'}`}><span className="font-black">Respuesta</span><p className="mt-1 truncate opacity-75">{reply.body || 'Contenido multimedia'}</p></div>}
                  {message.deleted_at ? <p className="text-sm italic opacity-60">Mensaje eliminado</p> : <>
                    {message.message_type === 'image' && url && <img src={url} alt={String(meta.file_name || 'Imagen compartida')} className="mb-2 max-h-80 rounded-xl object-cover" />}
                    {message.message_type === 'video' && url && <video src={url} controls playsInline className="mb-2 max-h-96 w-full rounded-xl" />}
                    {message.message_type === 'audio' && url && <div className="mb-2 flex items-center gap-2"><Mic size={16} /><audio src={url} controls className="w-full max-w-sm" /></div>}
                    {(message.message_type === 'document' || message.message_type === 'file') && url && <a href={url} target="_blank" rel="noreferrer" className="mb-2 flex items-center gap-3 rounded-xl bg-black/10 px-3 py-3 text-sm font-bold underline"><FileText size={18} /> {String(meta.file_name || 'Abrir archivo')}</a>}
                    {message.body && <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p>}
                    <div className={`mt-2 flex items-center justify-end gap-2 text-[10px] ${mine ? 'text-slate-700/70' : 'text-slate-500'}`}><span>{message.edited_at ? 'editado · ' : ''}{time(message.created_at)}</span>{mine && <CheckCheck size={13} aria-label="Enviado" />}</div>
                    <div className={`${selectedMessage === message.id ? 'flex' : 'hidden group-hover:flex'} absolute bottom-full right-0 z-20 mb-2 items-center gap-1 rounded-2xl border border-white/10 bg-slate-900 p-1 shadow-2xl`}><button type="button" onClick={() => void react(message.id, '👍')} className="rounded-xl p-2 hover:bg-white/10" aria-label="Reaccionar">👍</button><button type="button" onClick={() => setReplyTo(message)} className="rounded-xl p-2 hover:bg-white/10" aria-label="Responder">↩</button><button type="button" onClick={() => void copyMessage(message)} className="rounded-xl p-2 hover:bg-white/10" aria-label="Copiar"><Copy size={14} /></button><button type="button" onClick={() => void togglePin(message)} className="rounded-xl p-2 hover:bg-white/10" aria-label="Fijar"><Pin size={14} /></button><button type="button" onClick={() => void forwardMessage(message)} className="rounded-xl p-2 hover:bg-white/10" aria-label="Reenviar"><Forward size={14} /></button>{mine && message.body && <><button type="button" onClick={() => { const next = window.prompt('Editar mensaje', message.body || ''); if (next?.trim()) void updateMessage(message, next.trim()) }} className="rounded-xl px-2 py-2 text-[10px] font-black hover:bg-white/10">Editar</button><button type="button" onClick={() => void updateMessage(message, null, true)} className="rounded-xl p-2 text-rose-300 hover:bg-white/10" aria-label="Eliminar"><Trash2 size={14} /></button></>}</div>
                    <button type="button" onClick={() => setSelectedMessage((current) => current === message.id ? null : message.id)} className="absolute inset-0 rounded-2xl" aria-label="Acciones del mensaje" />
                  </>}
                </div></div>
              })}
            </div>

            <div className="border-t border-white/10 bg-slate-950/75 p-3 sm:p-4">
              {replyTo && <div className="mb-3 flex items-center justify-between rounded-xl border border-cyan-300/10 bg-cyan-300/[.05] px-3 py-2 text-xs"><div><span className="font-black text-cyan-200">Respondiendo</span><p className="mt-1 max-w-xl truncate text-slate-300">{replyTo.body || 'Contenido multimedia'}</p></div><button type="button" onClick={() => setReplyTo(null)} aria-label="Cancelar respuesta"><X size={16} /></button></div>}
              {actionsOpen && <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-slate-900 p-3 sm:grid-cols-4"><label className="cursor-pointer rounded-xl bg-white/5 p-3 text-center text-xs font-black"><input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void sendFile(file); event.currentTarget.value = '' }} />🖼️ Foto</label><label className="cursor-pointer rounded-xl bg-white/5 p-3 text-center text-xs font-black"><input type="file" accept="video/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void sendFile(file); event.currentTarget.value = '' }} />🎬 Vídeo</label><label className="cursor-pointer rounded-xl bg-white/5 p-3 text-center text-xs font-black"><input type="file" accept="audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void sendFile(file); event.currentTarget.value = '' }} />📎 Archivo</label><button type="button" onClick={() => setActionsOpen(false)} className="rounded-xl bg-white/5 p-3 text-center text-xs font-black">✕ Cerrar</button></div>}
              {emojiOpen && <div className="mb-3 grid max-w-md grid-cols-6 gap-1 rounded-2xl border border-white/10 bg-slate-900 p-3 shadow-2xl">{EMOJIS.map((emoji) => <button type="button" key={emoji} onClick={() => { setDraft((current) => current + emoji); setEmojiOpen(false) }} className="rounded-xl p-2 text-xl hover:bg-white/10">{emoji}</button>)}</div>}
              <div className="flex items-end gap-2"><button type="button" onClick={() => { setActionsOpen((value) => !value); setEmojiOpen(false) }} disabled={!selected} className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-slate-300 disabled:opacity-40" aria-label="Adjuntar"><Paperclip size={19} /></button><div className="relative flex-1"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendText() } }} disabled={!selected} placeholder="Escribe un mensaje…" rows={1} className="min-h-11 max-h-32 w-full resize-none rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 pr-12 text-sm outline-none placeholder:text-slate-500 disabled:opacity-40" /><button type="button" onClick={() => { setEmojiOpen((value) => !value); setActionsOpen(false) }} disabled={!selected} className="absolute bottom-2.5 right-3 text-slate-400 hover:text-cyan-200 disabled:opacity-40" aria-label="Emojis"><Smile size={18} /></button></div>{recording ? <button type="button" onClick={stopRecording} className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white" aria-label="Detener grabación"><Square size={17} /></button> : <button type="button" onClick={() => void startRecording()} disabled={!selected || uploading} className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-slate-300 disabled:opacity-40" aria-label="Nota de voz"><Mic size={19} /></button>}{draft.trim() ? <button type="button" onClick={() => void sendText()} disabled={sending} className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cyan-300 text-slate-950 disabled:opacity-40" aria-label="Enviar"><Send size={18} /></button> : <span className="hidden size-11 sm:block" />}</div>
              {uploading && <p className="mt-2 text-[11px] text-cyan-200">Subiendo contenido…</p>}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
