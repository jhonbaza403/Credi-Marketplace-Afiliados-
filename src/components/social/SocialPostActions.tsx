"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Heart, MessageCircle, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type CommentRow = { id: string; body: string; created_at: string };
type Props = { postId: string; initialLikeCount: number; initialCommentCount: number; initiallyLiked: boolean };

export default function SocialPostActions({ postId, initialLikeCount, initialCommentCount, initiallyLiked }: Props) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [liked, setLiked] = useState(initiallyLiked);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [message, setMessage] = useState("");

  const loadComments = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) { setMessage("Las interacciones no están disponibles en este momento."); return; }
    const { data, error } = await supabase.from("feed_post_comments").select("id,body,created_at").eq("post_id", postId).order("created_at", { ascending: true }).limit(50);
    if (error) { setMessage("No pudimos cargar los comentarios. Inténtalo de nuevo."); return; }
    setComments((data ?? []) as CommentRow[]);
  }, [postId]);

  useEffect(() => { if (expanded) void loadComments(); }, [expanded, loadComments]);

  async function toggleLike() {
    if (busy) return;
    const supabase = createClient();
    if (!supabase) { setMessage("Las interacciones no están disponibles en este momento."); return; }
    setBusy(true); setMessage("");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { setMessage("Inicia sesión para indicar que te gusta esta publicación."); return; }
      if (liked) {
        const { error } = await supabase.from("feed_post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
        if (error) throw error;
        setLiked(false); setLikeCount((count) => Math.max(0, count - 1));
      } else {
        const { error } = await supabase.from("feed_post_likes").insert({ post_id: postId, user_id: user.id });
        if (error && error.code !== "23505") throw error;
        if (!error) { setLiked(true); setLikeCount((count) => count + 1); }
      }
    } catch { setMessage("No se pudo guardar tu reacción. Comprueba tu conexión e inténtalo otra vez."); }
    finally { setBusy(false); }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    if (body.length > 2000) { setMessage("El comentario no puede superar los 2000 caracteres."); return; }
    const supabase = createClient();
    if (!supabase) { setMessage("Los comentarios no están disponibles en este momento."); return; }
    setBusy(true); setMessage("");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { setMessage("Inicia sesión para comentar."); return; }
      const { data, error } = await supabase.from("feed_post_comments").insert({ post_id: postId, user_id: user.id, body }).select("id,body,created_at").single();
      if (error) throw error;
      setComments((current) => [...current, data as CommentRow]);
      setCommentCount((count) => count + 1); setDraft(""); setExpanded(true);
    } catch { setMessage("No se pudo publicar el comentario. Verifica que la publicación siga disponible."); }
    finally { setBusy(false); }
  }

  return (
    <div className="mt-5 border-t border-[var(--border)] pt-4">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={toggleLike} disabled={busy} aria-pressed={liked}
          className={"inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] " + (liked ? "border-rose-300 bg-rose-50 text-rose-700" : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-secondary)]")}>
          <Heart className={"size-4 " + (liked ? "fill-current" : "")} aria-hidden="true" />{liked ? "Te gusta" : "Me gusta"} <span>{likeCount}</span>
        </button>
        <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--surface-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">
          <MessageCircle className="size-4" aria-hidden="true" />Comentarios <span>{commentCount}</span>
        </button>
      </div>
      {expanded && <div className="mt-4 space-y-4">
        <ul aria-label="Comentarios de la publicación" className="space-y-3">
          {comments.map((comment) => <li key={comment.id} className="rounded-xl bg-[var(--surface-secondary)] p-3">
            <p className="whitespace-pre-wrap break-words text-sm text-[var(--foreground)]">{comment.body}</p>
            <time className="mt-1 block text-xs text-[var(--muted)]" dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleString()}</time>
          </li>)}
          {!comments.length && <li className="text-sm text-[var(--muted)]">Sé la primera persona en comentar.</li>}
        </ul>
        <form onSubmit={submitComment} className="flex items-end gap-2">
          <label className="min-w-0 flex-1"><span className="sr-only">Escribe un comentario</span>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} rows={2} placeholder="Escribe un comentario respetuoso…"
              className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]" />
          </label>
          <button type="submit" disabled={busy || !draft.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-black text-white disabled:opacity-50"><Send className="size-4" aria-hidden="true" />Publicar</button>
        </form>
      </div>}
      {message && <p role="status" aria-live="polite" className="mt-3 text-sm text-[var(--muted)]">{message}</p>}
    </div>
  );
}
