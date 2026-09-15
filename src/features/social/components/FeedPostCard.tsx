'use client'

import { useEffect, useMemo, useState } from 'react'
import { Heart, MessageCircle, Send, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  postId: string
  title: string | null
  body: string | null
  publishedAt: string | null
  ownerName: string
  ownerAvatar: string | null
  mediaUrl: string | null
  mediaType: string | null
  initialLikes: number
  initialComments: number
  initiallyLiked: boolean
}

type CommentRow = { id: string; user_id: string; body: string; created_at: string }

export default function FeedPostCard({ postId, title, body, publishedAt, ownerName, ownerAvatar, mediaUrl, mediaType, initialLikes, initialComments, initiallyLiked }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [liked, setLiked] = useState(initiallyLiked)
  const [likes, setLikes] = useState(initialLikes)
  const [comments, setComments] = useState(initialComments)
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentRows, setCommentRows] = useState<CommentRow[]>([])
  const [busy, setBusy] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setLiked(initiallyLiked), [initiallyLiked])

  async function toggleLike() {
    if (busy) return
    setBusy(true); setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Inicia sesión para reaccionar.'); setBusy(false); return }
    try {
      if (liked) {
        const { error: removeError } = await supabase.from('feed_post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
        if (removeError) throw removeError
        setLiked(false); setLikes((value) => Math.max(0, value - 1))
      } else {
        const { error: insertError } = await supabase.from('feed_post_likes').insert({ post_id: postId, user_id: user.id })
        if (insertError && insertError.code !== '23505') throw insertError
        setLiked(true); setLikes((value) => value + (insertError ? 0 : 1))
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible actualizar la reacción.') }
    finally { setBusy(false) }
  }

  async function loadComments() {
    setLoadingComments(true); setError(null)
    try {
      const { data, error: queryError } = await supabase.from('feed_post_comments').select('id,user_id,body,created_at').eq('post_id', postId).order('created_at', { ascending: false }).limit(50)
      if (queryError) throw queryError
      setCommentRows((data ?? []) as CommentRow[])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible cargar los comentarios.') }
    finally { setLoadingComments(false) }
  }

  async function submitComment() {
    const text = commentText.trim()
    if (!text || busy) return
    setBusy(true); setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Inicia sesión para comentar.'); setBusy(false); return }
    try {
      const { data, error: insertError } = await supabase.from('feed_post_comments').insert({ post_id: postId, user_id: user.id, body: text }).select('id,user_id,body,created_at').single()
      if (insertError) throw insertError
      if (data) setCommentRows((rows) => [data as CommentRow, ...rows])
      setComments((value) => value + 1); setCommentText('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible publicar el comentario.') }
    finally { setBusy(false) }
  }

  const initial = ownerName.trim().slice(0, 1).toUpperCase() || 'C'
  const date = publishedAt ? new Date(publishedAt).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' }) : ''

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-sm transition-shadow hover:shadow-marketplace">
      <header className="flex items-center gap-3 border-b border-border px-5 py-4 sm:px-6">
        {ownerAvatar ? <img src={ownerAvatar} alt="" className="size-11 rounded-full object-cover" /> : <div aria-hidden="true" className="flex size-11 items-center justify-center rounded-full bg-primary/10 font-black text-primary">{initial}</div>}
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-foreground">{ownerName}</p>{date && <p className="text-xs text-muted-foreground">{date}</p>}</div>
      </header>
      {mediaUrl && mediaType?.startsWith('video') && <video className="max-h-[620px] w-full bg-black object-contain" controls preload="metadata" src={mediaUrl} />}
      {mediaUrl && mediaType?.startsWith('image') && <img className="max-h-[620px] w-full object-cover" src={mediaUrl} alt={title || 'Multimedia de la publicación'} loading="lazy" />}
      <div className="p-5 sm:p-6">
        {title && <h3 className="text-lg font-black text-foreground">{title}</h3>}
        {body && <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground">{body}</p>}
        <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
          <button type="button" onClick={() => void toggleLike()} disabled={busy} aria-pressed={liked} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${liked ? 'bg-danger/10 text-danger' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}><Heart size={17} fill={liked ? 'currentColor' : 'none'} />{likes}</button>
          <button type="button" onClick={() => { const next = !commentOpen; setCommentOpen(next); if (next && !commentRows.length) void loadComments() }} className="inline-flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-muted/80"><MessageCircle size={17} />{comments}</button>
          <button type="button" onClick={() => { if (typeof navigator !== 'undefined' && navigator.share) void navigator.share({ title: title || 'Credi Marketplace', text: body || '', url: window.location.href }).catch(() => undefined); else void navigator.clipboard?.writeText(window.location.href) }} aria-label="Compartir publicación" className="ml-auto inline-flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-muted/80"><Send size={16} />Compartir</button>
        </div>
        {error && <p role="alert" className="mt-3 text-xs font-semibold text-danger">{error}</p>}
        {commentOpen && <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div className="flex gap-2"><input value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submitComment() } }} maxLength={2000} placeholder="Escribe un comentario…" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" /><button type="button" onClick={() => void submitComment()} disabled={busy || !commentText.trim()} aria-label="Publicar comentario" className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50">{busy ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}</button></div>
          {loadingComments ? <p className="text-xs text-muted-foreground">Cargando comentarios…</p> : commentRows.map((comment) => <div key={comment.id} className="rounded-xl bg-muted/60 p-3"><p className="text-xs font-bold text-muted-foreground">{comment.user_id.slice(0, 8)}</p><p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{comment.body}</p></div>)}
        </div>}
      </div>
    </article>
  )
}
