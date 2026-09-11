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
    const channel = supabase.channel(`credibusiness-chat:${selectedId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedId}` }, (payload) => {
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
    const target = window.prompt(`Reenviar a número de conversación:\n${conversations.map((c, i) => `${i + 1}. ${c.display_name}`).join('\n')}`)
    const index = Number(target) - 1
    const destination = Number.isInteger(index) ? conversations[index] : null
    if (!destination) return
    const { error: e } = await supabase.from('messages').insert({ conversation_id: destination.id, sender_id: userId, message_type: message.message_type, body: message.body, metadata: { ...message.metadata, forwarded: true, forwarded_from: message.conversation_id } })
    if (e) setError(fail(e, 'No fue posible reenviar el mensaje.'))
  }

  const selected = conversations.find((c) => c.id === selectedId) ?? null
  const peerId = selected?.member_ids.find((id) => id !== userId) ?? null
  const peer = peerId ? profiles[peerId] : null
  const list = conversations.filter((c) => { const q = search.toLowerCase().trim(); return !q || c.display_name.toLowerCase().includes(q) || Boolean(c.title?.toLowerCase().includes(q)) })
  const shown = messages.filter((m) => !chatSearch.trim() || Boolean(m.body?.toLowerCase().includes(chatSearch.toLowerCase()))).slice(-500)

  return <main className="credi-business-chat min-h-[calc(100vh-80px)] bg-[#050816] text-white"><div className="mx-auto max-w-[1500px] px-3 py-4 sm:px-6 sm:py-7">
    <header className="mb-4 rounded-[1.75rem] border border-cyan-300/10 bg-[#08101f] p-5 sm:p-7"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200"><MessageCircle size={22}/></span><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Credi Business Chat</p><h1 className="text-2xl font-black sm:text-3xl">Mensajería comercial instantánea</h1></div></div><span className="rounded-full border border-emerald-400/15 bg-emerald-400/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-200">● Tiempo real</span></div><p className="mt-3 text-sm leading-6 text-slate-300">Comunicación privada y empresarial vinculada al negocio, con multimedia, notas de voz, respuestas, reacciones, documentos, búsqueda y llamadas de voz o vídeo.</p></header>
    {error && <div className="mb-4 flex items-center justify-between rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100"><span>{error}</span><button onClick={()=>setError(null)} aria-label="Cerrar"><X size={17}/></button></div>}
    <div className="chat-shell grid min-h-[720px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[.03] shadow-2xl lg:grid-cols-[330px_1fr]">
      <aside className="border-b border-white/10 bg-slate-950/70 lg:border-b-0 lg:border-r"><div className="border-b border-white/10 p-4"><div className="relative"><Search className="absolute left-3 top-3.5 size-4 text-slate-500"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar conversaciones" className="w-full rounded-xl border border-white/10 bg-white/[.04] py-3 pl-9 pr-3 text-sm outline-none placeholder:text-slate-500"/></div></div><div className="max-h-[630px] overflow-y-auto">{list.length ? list.map((c)=><button key={c.id} type="button" onClick={()=>{setSelectedId(c.id);router.replace(`/chat?conversation=${encodeURIComponent(c.id)}`)}} className={`w-full border-b border-white/5 px-4 py-4 text-left hover:bg-white/[.04] ${selectedId===c.id?'bg-cyan-300/[.08]':''}`}><div className="flex gap-3"><div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-cyan-300/10 font-black text-cyan-100">{c.display_name.slice(0,1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{c.display_name}</p><p className="mt-1 truncate text-xs text-slate-400">{c.title||'Conversación comercial'}</p></div></div></button>):<div className="p-6 text-sm leading-6 text-slate-400">No hay conversaciones. Abre un producto y pulsa “Contactar al proveedor”.</div>}</div></aside>
      <section className="chat-panel flex min-h-[720px] flex-col"><div className="border-b border-white/10 bg-slate-950/55 px-4 py-3 sm:px-5"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cyan-300/10 font-black">{selected?.display_name.slice(0,1).toUpperCase()||'C'}</div><div className="min-w-0"><p className="truncate text-sm font-black">{selected?.display_name||'Selecciona una conversación'}</p><p className="truncate text-xs text-slate-400">{peer?.role ? `${peer.role} · Credi Marketplace` : 'Canal comercial'}</p></div></div><CrediBusinessCall conversationId={selectedId} peerUserId={peerId} peerName={selected?.display_name||'Contacto comercial'}/></div>{context && <div className="mt-3 grid gap-2 rounded-2xl border border-cyan-300/10 bg-cyan-300/[.04] p-3 text-xs sm:grid-cols-2 lg:grid-cols-4"><div><span className="font-black text-cyan-200">Producto</span><p className="mt-1 text-slate-300">{String(context.product_title||context.b2b_title||context.product_id||context.b2b_product_id||'—')}</p></div><div><span className="font-black text-cyan-200">Empresa / tienda</span><p className="mt-1 text-slate-300">{String(context.store_name||'—')}</p></div><div><span className="font-black text-cyan-200">Pedido / país</span><p className="mt-1 text-slate-300">{String(context.order_id||context.country||'—')}</p></div><div><span className="font-black text-cyan-200">Afiliado</span><p className="mt-1 text-slate-300">{String(context.affiliate_ref||'—')}</p></div></div>}{selected && <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{QUICK.map((q)=><button key={q} type="button" onClick={()=>void sendText(q)} className="shrink-0 rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-[11px] font-bold text-slate-200">{q}</button>)}</div>}{selected && <div className="relative mt-3"><Search className="absolute left-3 top-2.5 size-4 text-slate-500"/><input value={chatSearch} onChange={(e)=>setChatSearch(e.target.value)} placeholder="Buscar dentro del chat" className="w-full rounded-xl border border-white/10 bg-white/[.03] py-2 pl-9 pr-3 text-xs outline-none placeholder:text-slate-500"/></div>}</div>
      <div ref={messageBox} className="flex-1 space-y-3 overflow-y-auto px-3 py-5 sm:px-6">{!selected?<div className="flex min-h-[500px] items-center justify-center text-center"><div><MessageCircle className="mx-auto size-16 text-cyan-200"/><h2 className="mt-5 text-xl font-black">Centro de comunicación comercial</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">Toda la negociación permanece dentro de Credi Marketplace.</p></div></div>:shown.map((m)=><div key={m.id} className={`flex ${m.sender_id===userId?'justify-end':'justify-start'}`}><div className={`group relative max-w-[90%] rounded-2xl px-4 py-3 sm:max-w-[78%] ${m.sender_id===userId?'bg-cyan-300 text-slate-950':'bg-slate-900 text-white'}`}>{Boolean(m.metadata.pinned)&&<div className="mb-2 flex items-center gap-1 text-[10px] font-black"><Pin size={11}/> Fijado</div>}{m.reply_to_id&&<div className="mb-2 rounded-xl bg-black/10 px-3 py-2 text-[11px]">Respuesta · {messages.find((x)=>x.id===m.reply_to_id)?.body||'Contenido multimedia'}</div>}{m.deleted_at?<p className="text-sm italic opacity-60">Mensaje eliminado</p>:<>{(()=>{const meta=getMeta(m);const url=typeof meta.public_url==='string'?meta.public_url:null;return <>{m.message_type==='image'&&url&&<img src={url} alt={String(meta.file_name||'Imagen')} className="mb-2 max-h-80 rounded-xl object-cover"/>}{m.message_type==='video'&&url&&<video src={url} controls playsInline className="mb-2 max-h-96 w-full rounded-xl"/>}{m.message_type==='audio'&&url&&<audio src={url} controls className="mb-2 w-full"/>}{(m.message_type==='document'||m.message_type==='file')&&url&&<a href={url} target="_blank" rel="noreferrer" className="mb-2 flex items-center gap-2 rounded-xl bg-black/10 p-3 text-sm font-bold underline"><FileText size={17}/>{String(meta.file_name||'Abrir archivo')}</a>}</>})()}{m.body&&<p className="whitespace-pre-wrap text-sm leading-6">{m.body}</p>}<div className="mt-2 flex items-center justify-end gap-2 text-[10px] opacity-70">{m.edited_at&&<span>editado</span>}<span>{fmt(m.created_at)}</span>{m.sender_id===userId&&<CheckCheck size={13}/>}</div></>}</div><div className="mt-1 flex gap-1 opacity-0 transition group-hover:opacity-100">{([['react','👍'],['copy','Copiar'],['pin','Fijar'],['edit','Editar'],['delete','Eliminar'],['forward','Reenviar']] as const).map(([type,label])=><button key={type} type="button" onClick={()=>void action(m,type)} className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-[10px] text-slate-300">{label}</button>)}</div></div>)}</div>
      {reply&&<div className="border-t border-white/10 bg-slate-950/60 px-4 py-3 text-xs text-slate-300">Respondiendo a: <strong>{reply.body||'Contenido multimedia'}</strong><button onClick={()=>setReply(null)} className="ml-3 text-cyan-300">Cerrar</button></div>}
      <div className="border-t border-white/10 bg-slate-950/75 p-3 sm:p-4"><div className="flex items-end gap-2"><div className="relative"><button type="button" onClick={()=>setEmojiOpen((v)=>!v)} className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-cyan-200"><Smile size={19}/></button>{emojiOpen&&<div className="absolute bottom-14 left-0 z-20 grid w-72 grid-cols-9 gap-1 rounded-2xl border border-white/10 bg-slate-950 p-3 shadow-2xl">{EMOJIS.map((emoji)=><button key={emoji} type="button" onClick={()=>setDraft((d)=>d+emoji)} className="rounded-lg p-2 text-lg hover:bg-white/10">{emoji}</button>)}</div>}</div><div className="relative"><button type="button" onClick={()=>setAttachOpen((v)=>!v)} className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-cyan-200" aria-label="Adjuntar archivo"><Paperclip size={19}/></button>{attachOpen&&<div className="absolute bottom-14 left-0 z-20 w-60 rounded-2xl border border-white/10 bg-slate-950 p-2 shadow-2xl"><label className="flex cursor-pointer items-center gap-2 rounded-xl p-3 text-sm hover:bg-white/10"><FileText size={17}/> Archivo<input type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" className="hidden" onChange={(e)=>{const f=e.target.files?.[0];e.currentTarget.value='';if(f)void sendFile(f)}}/></label></div>}</div><button type="button" onClick={()=>void recordVoice()} disabled={!selectedId||uploading} className={`flex size-11 items-center justify-center rounded-xl border border-white/10 ${recording?'bg-rose-500/15 text-rose-200':'bg-white/[.04] text-cyan-200'} disabled:cursor-not-allowed disabled:opacity-40`} aria-label={recording?'Detener grabación':'Grabar nota de voz'}>{recording?<Square size={17}/>:<Mic size={19}/>}</button><textarea value={draft} onChange={(e)=>setDraft(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void sendText()}}} disabled={!selectedId||busy} placeholder="Escribe un mensaje…" rows={1} className="min-h-11 flex-1 resize-none rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"/><button type="button" onClick={()=>void sendText()} disabled={!draft.trim()||busy||!selectedId} className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cyan-300 text-slate-950 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Enviar mensaje"><Send size={18}/></button></div>{uploading&&<p className="mt-2 text-[11px] text-cyan-200">Procesando archivo o nota de voz…</p>}{recording&&<p className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-rose-500"><span className="size-2 animate-pulse rounded-full bg-rose-500"/> Grabando nota de voz</p>}</div>
    </section></div></div></main>
}
