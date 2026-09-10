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

    const { data: memberships, error: memberError } = await supabase
      .from('conversation_members')
      .select('conversation_id,user_id,last_read_at')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })

    if (memberError) throw memberError
    const ids = (memberships ?? []).map((row) => row.conversation_id)
    if (!ids.length) {
      setConversations([])
      setLoading(false)
      return
    }

    const { data: rows, error: conversationError } = await supabase
      .from('conversations')
      .select('id,kind,title,created_by,product_id,order_id,store_id,b2b_product_id,created_at,updated_at')
      .in('id', ids)
      .order('updated_at', { ascending: false })
    if (conversationError) throw conversationError

    const { data: allMembers, error: allMemberError } = await supabase
      .from('conversation_members')
      .select('conversation_id,user_id,last_read_at')
      .in('conversation_id', ids)
    if (allMemberError) throw allMemberError

    const memberIds = [...new Set((allMembers ?? []).map((row) => row.user_id))]
    if (memberIds.length) {
      const { data: profileRows, error: profileError } = await supabase.from('profiles').select('id,full_name,email,avatar_url,role').in('id', memberIds)
      if (profileError) throw profileError
      setProfiles(Object.fromEntries((profileRows ?? []).map((row) => [row.id, row as Profile])))
    }

    const mapped = (rows ?? []).map((row) => {
      const memberRows = (allMembers ?? []).filter((member) => member.conversation_id === row.id)
      const other = memberRows.find((member) => member.user_id !== user.id)?.user_id ?? user.id
      const mine = memberRows.find((member) => member.user_id === user.id)
      return {
        ...row,
        member_ids: memberRows.map((member) => member.user_id),
        display_name: row.title || (profiles[other]?.full_name || profiles[other]?.email || 'Conversación comercial'),
        unread: 0,
        _last_read_at: mine?.last_read_at ?? null,
      }
    }) as ChatConversation[]
    setConversations(mapped)
    if (!selectedId && mapped[0]) setSelectedId(mapped[0].id)
    setLoading(false)
  }, [router, selectedId, supabase])

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data, error: messageError } = await supabase
      .from('messages')
      .select('id,conversation_id,sender_id,message_type,body,reply_to_id,edited_at,deleted_at,metadata,created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(200)
    if (messageError) throw messageError
    setMessages((data ?? []) as ChatMessage[])
    requestAnimationFrame(() => messageBox.current?.scrollTo({ top: messageBox.current.scrollHeight, behavior: 'smooth' }))
  }, [supabase])

  useEffect(() => { void loadConversations().catch((e) => { setError(e instanceof Error ? e.message : 'No fue posible cargar Credi Chat.'); setLoading(false) }) }, [loadConversations])
  useEffect(() => {
    if (!selectedId) return
    void loadMessages(selectedId).catch((e) => setError(e instanceof Error ? e.message : 'No fue posible cargar los mensajes.'))
    const channel = supabase
      .channel(`credichat:${selectedId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedId}` }, (payload) => {
        const next = payload.new as ChatMessage
        setMessages((current) => current.some((item) => item.id === next.id) ? current : [...current, next])
        requestAnimationFrame(() => messageBox.current?.scrollTo({ top: messageBox.current.scrollHeight, behavior: 'smooth' }))
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [loadMessages, selectedId, supabase])

  const openConversationFromContext = useCallback(async () => {
    const productId = searchParams.get('product')
    const b2bProductId = searchParams.get('b2bProduct')
    const target = searchParams.get('to')
    if (!userId || selectedId || (!productId && !b2bProductId && !target)) return

    let targetUserId = target
    let title = 'Nueva conversación comercial'
    let metadata: Record<string, unknown> = { source: 'credichat' }
    let storeId: string | null = null

    if (productId) {
      const { data: product, error: productError } = await supabase.from('products').select('id,title,store_id').eq('id', productId).maybeSingle()
      if (productError) throw productError
      if (!product) throw new Error('Producto no encontrado.')
      const { data: store, error: storeError } = await supabase.from('stores').select('id,store_name,vendor_id').eq('id', product.store_id).maybeSingle()
      if (storeError) throw storeError
      targetUserId = store?.vendor_id ?? null
      title = `Consulta: ${product.title}`
      storeId = store?.id ?? null
      metadata = { source: 'product', product_id: product.id, product_title: product.title, store_name: store?.store_name ?? null }
    }

    if (b2bProductId) {
      const { data: b2b, error: b2bError } = await supabase.from('b2b_products').select('id,title,supplier_id').eq('id', b2bProductId).maybeSingle()
      if (b2bError) throw b2bError
      if (!b2b) throw new Error('Oferta B2B no encontrada.')
      targetUserId = b2b.supplier_id
      title = `B2B: ${b2b.title}`
      metadata = { source: 'b2b', b2b_product_id: b2b.id, b2b_title: b2b.title }
    }

    if (!targetUserId || targetUserId === userId) return
    const { data, error: rpcError } = await supabase.rpc('create_credichat_direct_conversation', {
      p_target_user_id: targetUserId,
      p_product_id: productId,
      p_order_id: searchParams.get('order'),
      p_store_id: storeId,
      p_b2b_product_id: b2bProductId,
      p_title: title,
      p_metadata: metadata,
    })
    if (rpcError) throw rpcError
    const conversationId = String(data)
    setSelectedId(conversationId)
    router.replace(`/chat?conversation=${encodeURIComponent(conversationId)}`)
    await loadConversations()
  }, [loadConversations, router, searchParams, selectedId, supabase, userId])

  useEffect(() => { void openConversationFromContext().catch((e) => setError(e instanceof Error ? e.message : 'No fue posible iniciar la conversación.')) }, [openConversationFromContext])

  async function sendText() {
    const body = draft.trim()
    if (!body || !selectedId || !userId || sending) return
    setSending(true); setError(null)
    try {
      const { error: insertError } = await supabase.from('messages').insert({ conversation_id: selectedId, sender_id: userId, message_type: 'text', body })
      if (insertError) throw insertError
      setDraft('')
    } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible enviar el mensaje.') } finally { setSending(false) }
  }

  async function sendAttachment(file: File) {
    if (!selectedId || !userId) return
    setUploading(true); setError(null)
    try {
      const media = await uploadMarketplaceMedia(file)
      const type = media.kind === 'video' ? 'video' : 'image'
      const { data: message, error: messageError } = await supabase.from('messages').insert({ conversation_id: selectedId, sender_id: userId, message_type: type, metadata: { file_name: media.name, public_url: media.url, storage_path: media.path, mime_type: media.contentType, size_bytes: media.size } }).select('id').single()
      if (messageError || !message) throw messageError ?? new Error('No fue posible crear el mensaje multimedia.')
      const { error: attachmentError } = await supabase.from('message_attachments').insert({ message_id: message.id, storage_path: media.path, public_url: media.url, file_name: media.name, mime_type: media.contentType, size_bytes: media.size })
      if (attachmentError) throw attachmentError
    } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible cargar el archivo.') } finally { setUploading(false) }
  }

  const selected = conversations.find((item) => item.id === selectedId)
  const filtered = conversations.filter((item) => item.display_name.toLowerCase().includes(search.trim().toLowerCase()) || item.title?.toLowerCase().includes(search.trim().toLowerCase()))
  const otherId = selected?.member_ids.find((id) => id !== userId) ?? null

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8">
        <div className="mb-4 rounded-[1.75rem] border border-cyan-300/10 bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,.13),transparent_28%),linear-gradient(135deg,#0b1024,#060914)] p-5 sm:p-7">
          <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200"><MessageCircle size={20} /></span><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Credi Business Chat</p><h1 className="text-2xl font-black sm:text-3xl">Comunicación comercial integrada</h1></div></div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Habla con compradores, vendedores y proveedores sin salir de Credi Marketplace. Las conversaciones pueden quedar vinculadas a productos, B2B y pedidos.</p>
        </div>

        {error && <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100"><span>{error}</span><button type="button" onClick={() => setError(null)} aria-label="Cerrar error"><X size={17} /></button></div>}

        <div className="grid min-h-[620px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[.03] shadow-2xl lg:grid-cols-[340px_1fr]">
          <aside className="border-b border-white/10 bg-slate-950/40 lg:border-b-0 lg:border-r">
            <div className="border-b border-white/10 p-4"><div className="relative"><Search className="absolute left-3 top-3.5 size-4 text-slate-500"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar conversaciones" className="w-full rounded-xl border border-white/10 bg-white/[.04] py-3 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500"/></div></div>
            <div className="max-h-[280px] overflow-y-auto lg:max-h-[540px]">{loading ? <div className="p-6 text-sm text-slate-400">Cargando Credi Chat…</div> : filtered.length ? filtered.map((item) => <button key={item.id} type="button" onClick={()=>{setSelectedId(item.id); router.replace(`/chat?conversation=${encodeURIComponent(item.id)}`)}} className={`w-full border-b border-white/5 px-4 py-4 text-left transition hover:bg-white/[.04] ${selectedId===item.id?'bg-cyan-300/[.08]':''}`}><div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300/20 to-violet-400/20 text-xs font-black text-cyan-100">{item.display_name.slice(0,1).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-black text-white">{item.display_name}</p><span className="text-[10px] text-slate-500">{new Date(item.updated_at).toLocaleDateString('es-VE')}</span></div><p className="mt-1 truncate text-xs text-slate-400">{item.title || 'Conversación comercial'}</p></div></div></button>) : <div className="p-6 text-sm leading-6 text-slate-400">Aún no tienes conversaciones. Desde un producto o una oferta B2B pulsa <b className="text-cyan-200">Contactar</b> para iniciar una.</div>}</div>
          </aside>

          <section className="flex min-h-[620px] flex-col bg-[#08101f]/70">
            {selected ? <>
              <header className="flex items-center gap-3 border-b border-white/10 px-5 py-4"><div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300/20 to-violet-400/20 font-black text-cyan-100">{(selected.display_name||'C').slice(0,1).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-black">{selected.display_name}</p><p className="truncate text-xs text-slate-400">{selected.title || 'Canal comercial protegido'}</p></div>{otherId && profiles[otherId]?.role && <span className="ml-auto rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">{profiles[otherId].role}</span>}</header>
              <div ref={messageBox} className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
                {messages.length ? messages.map((message) => { const mine = message.sender_id === userId; const meta = message.metadata || {}; const mediaUrl = typeof meta.public_url === 'string' ? meta.public_url : null; return <div key={message.id} className={`flex ${mine?'justify-end':'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${mine?'rounded-br-md bg-cyan-300 text-slate-950':'rounded-bl-md border border-white/10 bg-white/[.05] text-slate-100'}`}>{message.message_type==='image' && mediaUrl ? <img src={mediaUrl} alt="Archivo compartido" className="mb-2 max-h-72 rounded-xl object-cover"/> : null}{message.message_type==='video' && mediaUrl ? <video src={mediaUrl} controls className="mb-2 max-h-72 rounded-xl"/> : null}{message.body && <p className="whitespace-pre-wrap leading-6">{message.body}</p>}{message.message_type==='image' && !mediaUrl && <p>Imagen compartida</p>}{message.message_type==='video' && !mediaUrl && <p>Vídeo compartido</p>}<div className={`mt-1 text-[9px] ${mine?'text-slate-700':'text-slate-500'}`}>{new Date(message.created_at).toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'})}</div></div></div> }) : <div className="flex h-full items-center justify-center text-center text-sm text-slate-500"><div><MessageCircle className="mx-auto mb-3 size-8 text-cyan-300/40"/><p>Inicia la conversación.</p><p className="mt-1 text-xs">Pregunta por precio, disponibilidad, MOQ, envío o condiciones comerciales.</p></div></div>}
              </div>
              <div className="border-t border-white/10 bg-slate-950/60 p-3 sm:p-4"><div className="flex items-end gap-2"><label className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-slate-300 hover:bg-white/[.08]" aria-label="Adjuntar imagen o vídeo"><Paperclip size={18}/><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" className="sr-only" disabled={uploading} onChange={(e)=>{const file=e.target.files?.[0];if(file) void sendAttachment(file);e.currentTarget.value=''}}/></label><button type="button" className="hidden size-11 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-slate-300 hover:bg-white/[.08] sm:flex" aria-label="Añadir emoji"><Smile size={18}/></button><textarea value={draft} onChange={(e)=>setDraft(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void sendText()}}} rows={1} placeholder="Escribe un mensaje comercial…" className="max-h-32 min-h-11 flex-1 resize-y rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"/><button type="button" onClick={()=>void sendText()} disabled={sending||uploading||!draft.trim()} className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cyan-300 text-slate-950 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Enviar mensaje"><Send size={18}/></button></div><p className="mt-2 text-[10px] text-slate-500">{uploading?'Subiendo archivo…':'Enter envía · Shift+Enter agrega una línea'}</p></div>
            </> : <div className="flex flex-1 items-center justify-center p-8 text-center"><div><MessageCircle className="mx-auto mb-4 size-12 text-cyan-300/30"/><h2 className="text-xl font-black">Credi Chat</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-400">Selecciona una conversación o entra a un producto/B2B para contactar directamente al comerciante.</p></div></div>}
          </section>
        </div>
      </div>
    </main>
  )
}
