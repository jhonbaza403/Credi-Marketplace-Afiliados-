'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Building2, CheckCheck, FileText, Hash, Megaphone, MessageCircle, Mic, Paperclip, Pin, Plus, Search, Send, Settings2, Smile, Square, Users, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CrediBusinessCall from '@/components/chat/CrediBusinessCall'
import { uploadCrediBusinessChatMedia } from '@/lib/storage/credibusiness-chat-media'
import type { ChatConversation, ChatMessage } from '@/types/chat'

type Profile = { id: string; full_name: string | null; avatar_url: string | null; role: string }
type RealtimePayload<T> = { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: T; old: Partial<T> | null }
type ConversationRow = { id: string; [key: string]: unknown }
type ContactRow = { id?: string; user_id?: string; [key: string]: unknown }
type ConversationView = ChatConversation & {
  my_role: string
  last_message_preview: string
  last_message_at: string | null
}
type ChatFolder = 'all' | 'unread' | 'direct' | 'group' | 'channel' | 'business'
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
  const [folder, setFolder] = useState<ChatFolder>('all')
  const [communityOpen, setCommunityOpen] = useState(false)
  const [communityKind, setCommunityKind] = useState<'group' | 'channel'>('group')
  const [communityName, setCommunityName] = useState('')
  const [communityDescription, setCommunityDescription] = useState('')
  const [communityPins, setCommunityPins] = useState('')
  const [communityBusy, setCommunityBusy] = useState(false)
  const [loadingState, setLoadingState] = useState(true)
  const [infoOpen, setInfoOpen] = useState(true)

  const refresh = useCallback(async () => {
    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!auth.user) { router.replace(`/login?next=${encodeURIComponent('/chat')}`); return null }
    setUserId(auth.user.id)
    const { data: memberships, error: membershipError } = await supabase.from('conversation_members').select('conversation_id,user_id,last_read_at,joined_at,member_role').eq('user_id', auth.user.id).order('joined_at', { ascending: false })
    if (membershipError) throw membershipError
    const ids = [...new Set((memberships ?? []).map((m: { conversation_id: string }) => m.conversation_id))]
    if (!ids.length) { setConversations([]); setLoadingState(false); return auth.user.id }
    const [{ data: rows, error: rowError }, { data: members, error: membersError }, { data: recentMessages, error: recentMessageError }] = await Promise.all([
      supabase.from('conversations').select('id,kind,title,created_by,product_id,order_id,store_id,b2b_product_id,created_at,updated_at,metadata').in('id', ids).order('updated_at', { ascending: false }),
      supabase.from('conversation_members').select('conversation_id,user_id,last_read_at,member_role').in('conversation_id', ids),
      supabase.from('messages').select('id,conversation_id,sender_id,message_type,body,created_at').in('conversation_id', ids).order('created_at', { ascending: false }).limit(1200),
    ])
    if (rowError) throw rowError
    if (membersError) throw membersError
    if (recentMessageError) throw recentMessageError
    const memberIds = [...new Set((members ?? []).map((m: ContactRow) => m.user_id).filter((id: unknown): id is string => typeof id === 'string'))]
    const profileMap: Record<string, Profile> = {}
    if (memberIds.length) {
      const { data: people, error: peopleError } = await supabase.from('profiles').select('id,full_name,avatar_url,role').in('id', memberIds)
      if (peopleError) throw peopleError
      for (const person of people ?? []) profileMap[person.id] = person as Profile
    }
    setProfiles(profileMap)
    const lastMessageByConversation = new Map<string, { body: string | null; message_type: string; created_at: string }>()
    const unreadByConversation = new Map<string, number>()
    for (const message of recentMessages ?? []) {
      if (!lastMessageByConversation.has(message.conversation_id)) {
        lastMessageByConversation.set(message.conversation_id, message)
      }
      const mine = (members ?? []).find((member: { conversation_id: string; user_id: string }) =>
        member.conversation_id === message.conversation_id && member.user_id === auth.user!.id
      )
      if (message.sender_id !== auth.user.id && (!mine?.last_read_at || message.created_at > mine.last_read_at)) {
        unreadByConversation.set(message.conversation_id, (unreadByConversation.get(message.conversation_id) ?? 0) + 1)
      }
    }
    const mapped = (rows ?? []).map((row: ConversationRow) => {
      const ms = (members ?? []).filter((member: { conversation_id: string; user_id: string }) => member.conversation_id === row.id)
      const otherId = ms.find((member: { user_id: string }) => member.user_id !== auth.user!.id)?.user_id
      const mine = ms.find((member: { user_id: string }) => member.user_id === auth.user!.id)
      const last = lastMessageByConversation.get(row.id)
      const preview = last?.body?.trim()
        || (last?.message_type === 'image' ? '📷 Imagen'
          : last?.message_type === 'video' ? '🎬 Vídeo'
          : last?.message_type === 'audio' ? '🎙 Nota de voz'
          : last?.message_type === 'document' || last?.message_type === 'file' ? '📎 Archivo'
          : last ? 'Nuevo mensaje' : 'Inicia una conversación')
      return {
        ...row,
        member_ids: ms.map((member: { user_id: string }) => member.user_id),
        display_name: row.title || (otherId ? profileMap[otherId]?.full_name : null) || 'Usuario Credi',
        unread: unreadByConversation.get(row.id) ?? 0,
        my_role: mine?.member_role ?? 'member',
        last_message_preview: preview,
        last_message_at: last?.created_at ?? null,
      } as ConversationView
    })
    setConversations(mapped)
    setSelectedId((current) => current && mapped.some((c: ChatConversation) => c.id === current) ? current : mapped[0]?.id ?? null)
    setLoadingState(false)
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

  async function createCommunity() {
    const title = communityName.trim()
    if (title.length < 2 || communityBusy) return
    setCommunityBusy(true)
    setError(null)
    try {
      const identifiers = communityPins.split(/[\\n,;]+/).map((value) => value.trim()).filter(Boolean)
      if (identifiers.length > 200) throw new Error('Puedes invitar hasta 200 participantes en este momento.')
      const memberIds: string[] = []
      for (const identifier of identifiers) {
        const { data, error: contactError } = await supabase.rpc('get_credi_contact', { p_identifier: identifier })
        if (contactError) throw contactError
        const contact = Array.isArray(data) ? data[0] : data
        if (!contact || typeof contact.id !== 'string') {
          throw new Error('No encontramos un contacto activo para uno de los PIN o números indicados.')
        }
        memberIds.push(contact.id)
      }
      const { data, error: createError } = await supabase.rpc('create_credichat_community', {
        p_title: title,
        p_kind: communityKind,
        p_member_ids: memberIds,
        p_description: communityDescription.trim() || null,
      })
      if (createError) throw createError
      const id = String(data)
      if (!id || id === 'null') throw new Error('No se recibió el identificador de la comunidad.')
      setCommunityOpen(false)
      setCommunityName('')
      setCommunityDescription('')
      setCommunityPins('')
      setFolder(communityKind)
      await refresh()
      setSelectedId(id)
      router.replace(`/chat?conversation=${encodeURIComponent(id)}`)
    } catch (e) {
      setError(fail(e, 'No fue posible crear la comunidad de Credi Chat.'))
    } finally {
      setCommunityBusy(false)
    }
  }

  async function action(message: ChatMessage, type: 'react'|'copy'|'pin'|'delete'|'edit'|'forward') {
    if (!userId) return
    if (type === 'react') { const { error: e } = await supabase.from('message_reactions').upsert({ message_id: message.id, user_id: userId, reaction: '👍' }, { onConflict: 'message_id,user_id,reaction' }); if (e) setError(fail(e, 'No fue posible reaccionar.')); return }
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
  const list = conversations.filter((c) => {
    const q = search.toLowerCase().trim()
    const matchesSearch = !q || c.display_name.toLowerCase().includes(q) || Boolean(c.title?.toLowerCase().includes(q)) || c.last_message_preview?.toLowerCase().includes(q)
    const matchesFolder = folder === 'all'
      || (folder === 'unread' && c.unread > 0)
      || c.kind === folder
      || (folder === 'business' && ['business', 'support'].includes(c.kind))
    return matchesSearch && matchesFolder
  })
  const canPost = !selected || selected.kind !== 'channel' || ['admin', 'support'].includes((selected as ConversationView).my_role)
  const sharedMediaCount = messages.filter((message) => ['image', 'video', 'audio', 'document', 'file'].includes(message.message_type)).length
  const shown = messages.filter((m) => !chatSearch.trim() || Boolean(m.body?.toLowerCase().includes(chatSearch.toLowerCase()))).slice(-500)

  return (
    <main className="credi-business-chat credi-chat-page min-h-[calc(100vh-80px)]">
      <div className="mx-auto max-w-[1680px] px-2 py-3 sm:px-4 sm:py-5">
        <header className="credi-chat-topbar mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-lg shadow-violet-900/25"><MessageCircle size={21}/></span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-black uppercase tracking-[.2em] text-[var(--primary)]">Credi Connect</p>
              <h1 className="truncate text-lg font-black tracking-tight text-[var(--foreground)] sm:text-xl">Mensajería instantánea</h1>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-end gap-2">
            <span className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/[.06] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-600 sm:inline-flex">● Tiempo real</span>
            <button type="button" onClick={() => { setCommunityKind('group'); setCommunityOpen(true) }} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 px-3.5 text-xs font-black text-white shadow-md transition hover:-translate-y-0.5 hover:brightness-110 sm:px-4">
              <Plus size={16}/> <span className="hidden sm:inline">Nueva comunidad</span><span className="sm:hidden">Nuevo</span>
            </button>
          </div>
        </header>

        {error && <div role="alert" className="mb-3 flex items-center justify-between rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-700 dark:text-rose-100"><span>{error}</span><button type="button" onClick={()=>setError(null)} aria-label="Cerrar error"><X size={17}/></button></div>}

        <div className="credi-chat-workspace grid min-h-[720px] overflow-hidden rounded-[1.75rem] border shadow-2xl">
          <aside className="credi-chat-inbox min-w-0 border-r">
            <div className="border-b p-4">
              <div className="flex items-center justify-between gap-2">
                <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[var(--primary)]">Tu mensajería</p><h2 className="mt-1 text-lg font-black text-[var(--foreground)]">Conversaciones</h2></div>
                <button type="button" onClick={() => setCommunityOpen(true)} className="grid size-9 place-items-center rounded-xl border border-[var(--border)] text-[var(--primary)] transition hover:bg-[var(--surface-secondary)]" aria-label="Crear grupo o canal"><Plus size={17}/></button>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-3 size-4 text-[var(--muted)]"/>
                <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar chats, grupos y mensajes" aria-label="Buscar conversaciones" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] py-3 pl-9 pr-3 text-xs text-[var(--foreground)] outline-none transition focus:border-[var(--primary)]"/>
              </div>
              <div className="credi-chat-folders mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Filtros de conversaciones">
                {([
                  ['all','Todos'],
                  ['unread','No leídos'],
                  ['direct','Personales'],
                  ['group','Grupos'],
                  ['channel','Canales'],
                  ['business','Negocios'],
                ] as const).map(([key,label]) => (
                  <button key={key} type="button" role="tab" aria-selected={folder===key} onClick={()=>setFolder(key)} className={`rounded-full px-3 py-1.5 text-[10px] font-black transition ${folder===key?'bg-[var(--primary)] text-white shadow-md':'bg-[var(--surface-secondary)] text-[var(--muted)] hover:text-[var(--foreground)]'}`}>
                    {label}{key==='unread' && conversations.some((c)=>c.unread>0) ? <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] text-white">{conversations.reduce((n,c)=>n+c.unread,0)}</span> : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="credi-chat-conversation-list min-h-0 flex-1 overflow-y-auto">
              {loadingState ? <div className="p-6 text-xs text-[var(--muted)]">Sincronizando conversaciones…</div>
                : list.length ? list.map((c) => {
                  const kindLabel = c.kind === 'channel' ? 'Canal' : c.kind === 'group' ? 'Grupo' : ['business','support'].includes(c.kind) ? 'Negocio' : 'Personal'
                  const active = selectedId===c.id
                  return (
                    <button key={c.id} type="button" onClick={()=>{setSelectedId(c.id);router.replace(`/chat?conversation=${encodeURIComponent(c.id)}`)}} aria-current={active?'true':undefined} className={`credi-chat-conversation w-full border-b px-4 py-3.5 text-left transition ${active?'is-active':''}`}>
                      <div className="flex items-center gap-3">
                        <span className={`credi-chat-avatar grid size-12 shrink-0 place-items-center rounded-full text-sm font-black ${c.kind==='channel'?'is-channel':c.kind==='group'?'is-group':''}`}>{c.kind==='channel'?<Megaphone size={19}/>:c.kind==='group'?<Users size={19}/>:c.display_name.slice(0,1).toUpperCase()}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-black text-[var(--foreground)]">{c.display_name}</span><span className="shrink-0 text-[9px] text-[var(--muted)]">{c.last_message_at?fmt(c.last_message_at):''}</span></span>
                          <span className="mt-1 flex items-center justify-between gap-2"><span className="truncate text-[11px] text-[var(--muted)]">{c.last_message_preview || c.title || 'Conversación de Credi'}</span>{c.unread>0?<span className="grid min-w-5 place-items-center rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] font-black text-white">{c.unread>99?'99+':c.unread}</span>:null}</span>
                          <span className="mt-1 flex items-center gap-1.5"><span className="rounded-full bg-[var(--surface-tertiary)] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-[var(--muted)]">{kindLabel}</span>{c.member_ids.length>2?<span className="text-[9px] text-[var(--muted)]">{c.member_ids.length} participantes</span>:null}</span>
                        </span>
                      </div>
                    </button>
                  )
                }) : <div className="px-5 py-12 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]"><MessageCircle size={21}/></span><p className="mt-3 text-sm font-black text-[var(--foreground)]">{folder==='channel'?'Aún no sigues canales':folder==='group'?'Todavía no tienes grupos':'No hay conversaciones aquí'}</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Inicia un chat desde un producto o crea una comunidad privada.</p><button type="button" onClick={()=>setCommunityOpen(true)} className="mt-4 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-black text-white">Crear grupo o canal</button></div>}
            </div>
            <div className="border-t border-[var(--border)] p-3">
              <div className="flex items-center justify-between gap-2 rounded-xl bg-[var(--surface-secondary)] px-3 py-2.5">
                <span className="inline-flex items-center gap-2 text-[10px] font-bold text-[var(--muted)]"><Settings2 size={14}/> Herramientas comerciales</span>
                <span className="text-[9px] font-black text-[var(--primary)]">CREDI OS</span>
              </div>
            </div>
          </aside>

          <section className="credi-chat-thread flex min-h-[720px] min-w-0 flex-col">
            <div className="credi-chat-thread-head border-b px-4 py-3 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="credi-chat-avatar grid size-11 shrink-0 place-items-center rounded-full text-sm font-black">{selected?.kind==='channel'?<Megaphone size={18}/>:selected?.kind==='group'?<Users size={18}/>:selected?.display_name.slice(0,1).toUpperCase()||'C'}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--foreground)]">{selected?.display_name||'Selecciona una conversación'}</p>
                    <p className="truncate text-[10px] text-[var(--muted)]">{selected?.kind==='channel'?'Canal de difusión · Solo administradores publican':selected?.kind==='group'?`Grupo privado · ${selected.member_ids.length} participantes`:peer?.role?`${peer.role} · Credi Marketplace`:'Mensajería privada y comercial'}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {selected && <button type="button" onClick={()=>setInfoOpen((value)=>!value)} className="grid size-9 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-secondary)]" aria-label="Información del chat"><Building2 size={16}/></button>}
                  {selected?.kind==='direct' && <CrediBusinessCall conversationId={selectedId} peerUserId={peerId} peerName={selected?.display_name||'Contacto comercial'}/>}
                </div>
              </div>
              {context && <div className="mt-3 grid gap-2 rounded-xl border border-cyan-300/10 bg-cyan-300/[.04] p-3 text-[10px] sm:grid-cols-2 lg:grid-cols-4"><div><span className="font-black text-cyan-700 dark:text-cyan-200">Producto</span><p className="mt-1 truncate text-[var(--foreground)]">{String(context.product_title||context.b2b_title||context.product_id||context.b2b_product_id||'—')}</p></div><div><span className="font-black text-cyan-700 dark:text-cyan-200">Tienda</span><p className="mt-1 truncate text-[var(--foreground)]">{String(context.store_name||'—')}</p></div><div><span className="font-black text-cyan-700 dark:text-cyan-200">Pedido / país</span><p className="mt-1 truncate text-[var(--foreground)]">{String(context.order_id||context.country||'—')}</p></div><div><span className="font-black text-cyan-700 dark:text-cyan-200">Afiliado</span><p className="mt-1 truncate text-[var(--foreground)]">{String(context.affiliate_ref||'—')}</p></div></div>}
              {selected && canPost && <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{QUICK.slice(0,5).map((q)=><button key={q} type="button" onClick={()=>void sendText(q)} className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-1.5 text-[10px] font-bold text-[var(--muted)] transition hover:text-[var(--foreground)]">{q}</button>)}</div>}
              {selected && <div className="relative mt-3"><Search className="absolute left-3 top-2.5 size-4 text-[var(--muted)]"/><input value={chatSearch} onChange={(e)=>setChatSearch(e.target.value)} placeholder="Buscar dentro de esta conversación" aria-label="Buscar dentro del chat" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] py-2 pl-9 pr-3 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--muted-light)]"/></div>}
            </div>

            <div ref={messageBox} className="credi-chat-messages flex-1 space-y-3 overflow-y-auto px-3 py-5 sm:px-5">
              {!selected ? <div className="flex min-h-[500px] items-center justify-center p-6 text-center"><div><span className="mx-auto grid size-16 place-items-center rounded-[1.5rem] bg-gradient-to-br from-violet-500/15 to-cyan-400/15 text-[var(--primary)]"><MessageCircle size={29}/></span><h2 className="mt-4 text-xl font-black text-[var(--foreground)]">Tu centro de comunicación</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">Habla con tu comunidad, coordina pedidos y conecta con empresas desde una sola bandeja.</p></div></div>
                : shown.map((m)=><div key={m.id} className={`group flex ${m.sender_id===userId?'justify-end':'justify-start'}`}><div className={`relative max-w-[90%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[78%] ${m.sender_id===userId?'credi-chat-message-own':'credi-chat-message-other'}`}>{Boolean(m.metadata.pinned)&&<div className="mb-2 flex items-center gap-1 text-[10px] font-black"><Pin size={11}/> Mensaje fijado</div>}{m.reply_to_id&&<div className="mb-2 rounded-xl bg-black/10 px-3 py-2 text-[11px]">Respuesta · {messages.find((x)=>x.id===m.reply_to_id)?.body||'Contenido multimedia'}</div>}{m.deleted_at?<p className="text-sm italic opacity-60">Mensaje eliminado</p>:<>{(()=>{const meta=getMeta(m);const url=typeof meta.public_url==='string'?meta.public_url:null;return <>{m.message_type==='image'&&url&&<img src={url} alt={String(meta.file_name||'Imagen')} className="mb-2 max-h-80 rounded-xl object-cover"/>}{m.message_type==='video'&&url&&<video src={url} controls playsInline className="mb-2 max-h-96 w-full rounded-xl"/>}{m.message_type==='audio'&&url&&<audio src={url} controls className="mb-2 w-full"/>}{(m.message_type==='document'||m.message_type==='file')&&url&&<a href={url} target="_blank" rel="noreferrer" className="mb-2 flex items-center gap-2 rounded-xl bg-black/10 p-3 text-sm font-bold underline"><FileText size={17}/>{String(meta.file_name||'Abrir archivo')}</a>}</>})()}{m.body&&<p className="whitespace-pre-wrap text-sm leading-6">{m.body}</p>}<div className="mt-2 flex items-center justify-end gap-2 text-[10px] opacity-70">{m.edited_at&&<span>editado</span>}<span>{fmt(m.created_at)}</span>{m.sender_id===userId&&<CheckCheck size={13}/>}</div></>}</div><div className="credi-chat-message-actions ml-2 mt-1 flex flex-wrap gap-1"><button type="button" onClick={()=>void action(m,'react')} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px]" aria-label="Reaccionar al mensaje">👍</button><button type="button" onClick={()=>setReply(m)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px]">Responder</button><button type="button" onClick={()=>void action(m,'pin')} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px]">Fijar</button>{m.sender_id===userId&&<><button type="button" onClick={()=>void action(m,'edit')} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px]">Editar</button><button type="button" onClick={()=>void action(m,'delete')} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px]">Eliminar</button></>}<button type="button" onClick={()=>void action(m,'forward')} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px]">Reenviar</button></div></div>)}
            </div>

            {reply&&<div className="border-t border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-xs text-[var(--foreground)]"><div className="flex items-center justify-between gap-2"><span className="truncate">Respondiendo a: <strong>{reply.body||'Contenido multimedia'}</strong></span><button type="button" onClick={()=>setReply(null)} className="text-[var(--primary)]">Cerrar</button></div></div>}
            <div className="credi-chat-composer border-t border-[var(--border)] p-3 sm:p-4">
              {!selected ? <p className="text-xs text-[var(--muted)]">Selecciona una conversación para escribir.</p>
                : !canPost ? <div className="rounded-xl bg-[var(--surface-secondary)] p-3 text-xs text-[var(--muted)]">Este canal es de difusión. Solo los administradores pueden publicar; puedes leer y compartir el contenido.</div>
                : <>
                  <div className="flex items-end gap-2">
                    <div className="relative"><button type="button" onClick={()=>setEmojiOpen((v)=>!v)} className="grid size-11 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--primary)]" aria-label="Abrir emojis"><Smile size={19}/></button>{emojiOpen&&<div className="absolute bottom-14 left-0 z-20 grid w-72 grid-cols-9 gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-2xl">{EMOJIS.map((emoji)=><button key={emoji} type="button" onClick={()=>setDraft((d)=>d+emoji)} className="rounded-lg p-2 text-lg hover:bg-[var(--surface-secondary)]">{emoji}</button>)}</div>}</div>
                    <div className="relative"><button type="button" onClick={()=>setAttachOpen((v)=>!v)} className="grid size-11 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--primary)]" aria-label="Adjuntar archivo"><Paperclip size={19}/></button>{attachOpen&&<div className="absolute bottom-14 left-0 z-20 w-60 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-2xl"><label className="flex cursor-pointer items-center gap-2 rounded-xl p-3 text-sm text-[var(--foreground)] hover:bg-[var(--surface-secondary)]"><FileText size={17}/> Imagen, vídeo o documento<input type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" className="hidden" onChange={(e)=>{const file=e.target.files?.[0];e.currentTarget.value='';if(file)void sendFile(file)}}/></label></div>}</div>
                    <button type="button" onClick={()=>void recordVoice()} disabled={uploading} className={`grid size-11 place-items-center rounded-xl border ${recording?'border-rose-400 bg-rose-500/10 text-rose-600':'border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--primary)]'} disabled:opacity-40`} aria-label={recording?'Detener nota de voz':'Grabar nota de voz'}>{recording?<Square size={17}/>:<Mic size={19}/>}</button>
                    <textarea value={draft} onChange={(e)=>setDraft(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(selectedId)void sendText()}}} disabled={busy||!selectedId} placeholder="Escribe un mensaje…" rows={1} className="min-h-11 max-h-36 flex-1 resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-light)] focus:border-[var(--primary)] disabled:opacity-50"/>
                    <button type="button" onClick={()=>void sendText()} disabled={!draft.trim()||busy||!selectedId} className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 text-white shadow-md disabled:opacity-40" aria-label="Enviar mensaje"><Send size={18}/></button>
                  </div>
                  {uploading&&<p className="mt-2 text-[11px] text-[var(--primary)]">Procesando archivo o nota de voz…</p>}
                  {recording&&<p className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-rose-600"><span className="size-2 animate-pulse rounded-full bg-rose-500"/> Grabando nota de voz</p>}
                </>}
            </div>
          </section>

          {infoOpen && <aside className="credi-chat-info hidden border-l p-4 xl:block">
            {selected ? <>
              <div className="text-center">
                <span className="mx-auto grid size-16 place-items-center rounded-[1.5rem] bg-gradient-to-br from-violet-500/15 to-cyan-400/15 text-[var(--primary)]">{selected.kind==='channel'?<Megaphone size={25}/>:selected.kind==='group'?<Users size={25}/>:<Building2 size={25}/>}</span>
                <h2 className="mt-3 text-sm font-black text-[var(--foreground)]">{selected.display_name}</h2>
                <p className="mt-1 text-[10px] text-[var(--muted)]">{selected.kind==='channel'?'Canal privado':selected.kind==='group'?'Grupo privado':'Conversación comercial'}</p>
              </div>
              <div className="mt-5 space-y-3 border-y border-[var(--border)] py-4">
                <div><p className="text-[9px] font-black uppercase tracking-wider text-[var(--muted)]">Participantes</p><p className="mt-1 text-xs font-bold text-[var(--foreground)]">{selected.member_ids.length} personas</p></div>
                <div><p className="text-[9px] font-black uppercase tracking-wider text-[var(--muted)]">Mensajes cargados</p><p className="mt-1 text-xs font-bold text-[var(--foreground)]">{messages.length}</p></div>
                <div><p className="text-[9px] font-black uppercase tracking-wider text-[var(--muted)]">Archivos y multimedia</p><p className="mt-1 text-xs font-bold text-[var(--foreground)]">{sharedMediaCount} elementos</p></div>
                {selected.kind==='channel'&&<div className="rounded-xl bg-[var(--surface-secondary)] p-3 text-[10px] leading-5 text-[var(--muted)]">Canal de difusión: solo las cuentas administradoras pueden publicar mensajes.</div>}
              </div>
              <div className="mt-4"><p className="mb-2 text-[9px] font-black uppercase tracking-wider text-[var(--muted)]">Funciones disponibles</p><div className="grid grid-cols-2 gap-2">{[['Audio','🎙'],['Vídeo','🎬'],['Archivos','📎'],['Reacciones','❤️'],['Buscar','🔎'],['Citar','↩']].map(([label,emoji])=><div key={label} className="rounded-xl bg-[var(--surface-secondary)] p-2 text-center"><span className="text-lg">{emoji}</span><p className="mt-1 text-[9px] font-bold text-[var(--muted)]">{label}</p></div>)}</div></div>
            </> : <div className="py-10 text-center"><Users className="mx-auto size-8 text-[var(--muted)]"/><p className="mt-3 text-xs font-bold text-[var(--muted)]">Información del chat</p></div>}
          </aside>}
        </div>

        {communityOpen && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="credi-community-title">
          <form onSubmit={(event)=>{event.preventDefault();void createCommunity()}} className="w-full max-w-lg rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.17em] text-[var(--primary)]">Credi Connect</p><h2 id="credi-community-title" className="mt-1 text-xl font-black text-[var(--foreground)]">Crear comunidad</h2><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Crea un grupo privado o un canal de difusión para clientes, equipos y comunidades.</p></div><button type="button" onClick={()=>setCommunityOpen(false)} className="grid size-9 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted)]" aria-label="Cerrar"><X size={17}/></button></div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={()=>setCommunityKind('group')} aria-pressed={communityKind==='group'} className={`rounded-xl border p-3 text-left ${communityKind==='group'?'border-[var(--primary)] bg-[var(--primary)]/10':'border-[var(--border)] bg-[var(--surface-secondary)]'}`}><Users className="size-5 text-[var(--primary)]"/><span className="mt-2 block text-xs font-black text-[var(--foreground)]">Grupo privado</span><span className="mt-1 block text-[10px] leading-4 text-[var(--muted)]">Todos los miembros pueden conversar.</span></button>
              <button type="button" onClick={()=>setCommunityKind('channel')} aria-pressed={communityKind==='channel'} className={`rounded-xl border p-3 text-left ${communityKind==='channel'?'border-[var(--primary)] bg-[var(--primary)]/10':'border-[var(--border)] bg-[var(--surface-secondary)]'}`}><Megaphone className="size-5 text-[var(--primary)]"/><span className="mt-2 block text-xs font-black text-[var(--foreground)]">Canal</span><span className="mt-1 block text-[10px] leading-4 text-[var(--muted)]">Solo administradores publican.</span></button>
            </div>
            <label className="mt-4 block text-xs font-bold text-[var(--foreground)]">Nombre de la comunidad<input required minLength={2} maxLength={80} value={communityName} onChange={(event)=>setCommunityName(event.target.value)} placeholder={communityKind==='group'?'Ej. Equipo de ventas':'Ej. Novedades de mi tienda'} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--primary)]"/></label>
            <label className="mt-4 block text-xs font-bold text-[var(--foreground)]">Descripción <span className="font-normal text-[var(--muted)]">(opcional)</span><textarea maxLength={500} rows={2} value={communityDescription} onChange={(event)=>setCommunityDescription(event.target.value)} placeholder="¿De qué trata esta comunidad?" className="mt-2 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3 text-sm outline-none focus:border-[var(--primary)]"/></label>
            <label className="mt-4 block text-xs font-bold text-[var(--foreground)]">Invitar por PIN Credi o teléfono <span className="font-normal text-[var(--muted)]">(opcional)</span><textarea rows={2} value={communityPins} onChange={(event)=>setCommunityPins(event.target.value)} placeholder="Un PIN o número por línea; también puedes separarlos por comas." className="mt-2 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3 text-sm outline-none focus:border-[var(--primary)]"/></label>
            <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={()=>setCommunityOpen(false)} className="min-h-10 rounded-xl border border-[var(--border)] px-4 text-xs font-bold text-[var(--foreground)]">Cancelar</button><button type="submit" disabled={communityBusy||communityName.trim().length<2} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 px-5 text-xs font-black text-white disabled:opacity-50">{communityBusy?'Creando…':'Crear comunidad'}<ArrowRight size={14}/></button></div>
          </form>
        </div>}
      </div>
    </main>
  )
}
}
