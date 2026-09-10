'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCheck, FileText, MessageCircle, Mic, Paperclip, Pin, Search, Send, Smile, Square, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CrediBusinessCall from '@/components/chat/CrediBusinessCall'
import { uploadCrediBusinessChatMedia } from '@/lib/storage/credibusiness-chat-media'
import type { ChatConversation, ChatMessage } from '@/types/chat'

type Profile = { id: string; full_name: string | null; avatar_url: string | null; role: string }
const QUICK = ['Consultar disponibilidad', 'Solicitar precio mayorista', 'Solicitar catálogo', 'Preguntar MOQ', 'Solicitar condiciones de envío', 'Preguntar tiempo de entrega', 'Solicitar factura', 'Negociar pedido', 'Solicitar cotización']

function getMeta(message: ChatMessage) { return message.metadata as Record<string, unknown> }
function fmt(value: string) { return new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }

export default function CrediBusinessChat() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const messageBox = useRef<HTMLDivElement>(null)
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

  const refresh = useCallback(async () => {
    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!auth.user) { router.replace(`/login?next=${encodeURIComponent('/chat')}`); return null }
    setUserId(auth.user.id)
    const { data: memberships, error: membershipError } = await supabase.from('conversation_members').select('conversation_id,user_id,last_read_at,joined_at').eq('user_id', auth.user.id).order('joined_at', { ascending: false })
    if (membershipError) throw membershipError
    const ids = [...new Set((memberships ?? []).map((m) => m.conversation_id))]
    if (!ids.length) { setConversations([]); return auth.user.id }
    const [{ data: rows, error: rowError }, { data: members, error: membersError }] = await Promise.all([
      supabase.from('conversations').select('id,kind,title,created_by,product_id,order_id,store_id,b2b_product_id,created_at,updated_at,metadata').in('id', ids).order('updated_at', { ascending: false }),
      supabase.from('conversation_members').select('conversation_id,user_id,last_read_at').in('conversation_id', ids),
    ])
    if (rowError) throw rowError
    if (membersError) throw membersError
    const memberIds = [...new Set((members ?? []).map((m) => m.user_id))]
    const profileMap: Record<string, Profile> = {}
    if (memberIds.length) {
      const { data: people, error: peopleError } = await supabase.from('profiles').select('id,full_name,avatar_url,role').in('id', memberIds)
      if (peopleError) throw peopleError
      for (const person of people ?? []) profileMap[person.id] = person as Profile
    }
    setProfiles(profileMap)
    const mapped = (rows ?? []).map((row) => {
      const ms = (members ?? []).filter((m) => m.conversation_id === row.id)
      const otherId = ms.find((m) => m.user_id !== auth.user!.id)?.user_id
      return { ...row, member_ids: ms.map((m) => m.user_id), display_name: row.title || (otherId ? profileMap[otherId]?.full_name : null) || 'Usuario Credi', unread: 0 } as ChatConversation
    })
    setConversations(mapped)
    setSelectedId((current) => current && mapped.some((c) => c.id === current) ? current : mapped[0]?.id ?? null)
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
    const metadata: Record<string, unknown> = { source: 'credibusiness-chat', country, affiliate_ref: affiliateRef, order_id: orderId }
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
    setContext(metadata); setSelectedId(id); router.replace(`/chat?conversation=${encodeURIComponent(id)}`); await refresh()
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
      if (alive) setError(e instanceof Error ? e.message : 'No fue posible cargar Credi Business Chat.')
    })
    return () => { alive = false }
  }, [openBusinessContext, refresh])

  useEffect(() => {
    if (!selectedId) return
    void loadMessages(selectedId).catch((e) => setError(e instanceof Error ? e.message : 'No fue posible cargar los mensajes.'))
    const channel = supabase.channel(`credibusiness-chat:${selectedId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedId}` }, (payload) => {
      const next = payload.new as ChatMessage
      if (payload.eventType === 'INSERT') setMessages((current) => current.some((m) => m.id === next.id) ? current : [...current, next])
      if (payload.eventType === 'UPDATE') setMessages((current) => current.map((m) => m.id === next.id ? next : m))
    }).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [loadMessages, selectedId, supabase])

  async function sendText(text = draft) {
    if (!selectedId || !userId || !text.trim() || busy) return
    setBusy(true); setError(null)
    try {
      const { error: insertError } = await supabase.from('messages').insert({ conversation_id: selectedId, sender_id: userId, message_type: 'text', body: text.trim(), reply_to_id: reply?.id ?? null, metadata: { business_context: context, forwarded: false } })
      if (insertError) throw insertError
      setDraft(''); setReply(null); setEmojiOpen(false)
    } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible enviar el mensaje.') } finally { setBusy(false) }
  }

  async function sendFile(file: File) {
    if (!selectedId || !userId || uploading) return
    setUploading(true); setError(null)
    try {
      const media = await uploadCrediBusinessChatMedia(file)
      const { data: message, error: messageError } = await supabase.from('messages').insert({ conversation_id: selectedId, sender_id: userId, message_type: media.kind, reply_to_id: reply?.id ?? null, metadata: { file_name: media.name, public_url: media.url, storage_path: media.path, mime_type: media.contentType, size_bytes: media.size, business_context: context } }).select('id').single()
      if (messageError || !message) throw messageError ?? new Error('No fue posible crear el mensaje multimedia.')
      const { error: attachmentError } = await supabase.from('message_attachments').insert({ message_id: message.id, storage_path: media.path, public_url: media.url, file_name: media.name, mime_type: media.contentType, size_bytes: media.size })
      if (attachmentError) throw attachmentError
      setReply(null); setAttachOpen(false)
    } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible enviar el archivo.') } finally { setUploading(false) }
  }

  function recordVoice() {
    if (recording) return
    void navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const r = new MediaRecorder(stream, { mimeType: mime })
      r.ondataavailable = () => undefined
      r.onstop = () => stream.getTracks().forEach((t) => t.stop())
      r.start(); setRecording(true)
    }).catch((e) => setError(e instanceof Error ? e.message : 'No fue posible acceder al micrófono.'))
  }

  async function action(message: ChatMessage, type: 'react'|'copy'|'pin'|'delete'|'edit'|'forward') {
    if (!userId) return
    if (type === 'react') { const { error: e } = await supabase.from('message_reactions').upsert({ message_id: message.id, user_id: userId, reaction: '👍' }, { onConflict: 'message_id,user_id' }); if (e) setError(e.message); return }
    if (type === 'copy') { if (message.body) await navigator.clipboard.writeText(message.body); return }
    if (type === 'pin') { const { error: e } = await supabase.from('messages').update({ metadata: { ...getMeta(message), pinned: !Boolean(getMeta(message).pinned) } }).eq('id', message.id); if (e) setError(e.message); return }
    if (type === 'delete') { if (message.sender_id !== userId) return; const { error: e } = await supabase.from('messages').update({ body: null, deleted_at: new Date().toISOString() }).eq('id', message.id).eq('sender_id', userId); if (e) setError(e.message); return }
    if (type === 'edit') { if (message.sender_id !== userId || !message.body) return; const next = window.prompt('Editar mensaje', message.body); if (!next?.trim()) return; const { error: e } = await supabase.from('messages').update({ body: next.trim(), edited_at: new Date().toISOString() }).eq('id', message.id).eq('sender_id', userId); if (e) setError(e.message); return }
    const target = window.prompt(`Reenviar a número de conversación:\n${conversations.map((c, i) => `${i + 1}. ${c.display_name}`).join('\n')}`)
    const index = Number(target) - 1; const destination = Number.isInteger(index) ? conversations[index] : null
    if (!destination) return
    const { error: e } = await supabase.from('messages').insert({ conversation_id: destination.id, sender_id: userId, message_type: message.message_type, body: message.body, metadata: { ...getMeta(message), forwarded: true, forwarded_from: message.conversation_id } })
    if (e) setError(e.message)
  }

  void search
  void chatSearch
  void recordVoice
  void action
  void fmt
  void CrediBusinessCall
  void FileText
  void MessageCircle
  void Mic
  void Paperclip
  void Pin
  void Send
  void Smile
  void Square
  void CheckCheck
  void X
  void setProfiles
  void setChatSearch
  void setAttachOpen
  void setContext
  void setMessages
  void setProfiles
  void setUserId
  void setConversations
  void setSelectedId
  void setError
  void setBusy
  void setUploading
  void setRecording
  void setReply
  void setEmojiOpen
  void openBusinessContext
  void loadMessages
  void sendText
  void sendFile
  void router
  void params

  return null
}
