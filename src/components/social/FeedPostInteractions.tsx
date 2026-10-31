"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Heart, MessageCircle, Send, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Stats = { like_count: number; comment_count: number; liked_by_me: boolean };
type Comment = { id: string; body: string; user_id: string; created_at: string };

export default function FeedPostInteractions({ postId }: { postId: string }) {
  const [stats, setStats] = useState<Stats>({ like_count: 0, comment_count: 0, liked_by_me: false });
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_feed_post_stats", { p_post_ids: [postId] });
    if (error) { setNotice("Las interacciones no están disponibles en este momento."); return; }
    const row = Array.isArray(data) ? data[0] : null;
    if (row) setStats({ like_count: Number(row.like_count || 0), comment_count: Number(row.comment_count || 0), liked_by_me: Boolean(row.liked_by_me) });
  }, [postId]);

  const loadComments = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from("feed_post_comments").select("id,body,user_id,created_at").eq("post_id", postId).order("created_at", { ascending: false }).limit(30);
    if (error) { setNotice("No fue posible cargar los comentarios."); return; }
    setComments((data || []) as Comment[]);
  }, [postId]);

  useEffect(() => { void loadStats(); }, [loadStats]);

  async function toggleLike() {
    if (busy) return;
    setBusy(true); setNotice(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.assign(`/login?next=${encodeURIComponent("/social")}`); return; }
      if (stats.liked_by_me) {
        const { error } = await supabase.from("feed_post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("feed_post_likes").insert({ post_id: postId, user_id: user.id });
        if (error && error.code !== "23505") throw error;
      }
      await loadStats();
    } catch (error) { setNotice(error instanceof Error ? error.message : "No fue posible actualizar el me gusta."); }
    finally { setBusy(false); }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || body.length > 2000 || busy) return;
    setBusy(true); setNotice(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.assign(`/login?next=${encodeURIComponent("/social")}`); return; }
      const { error } = await supabase.from("feed_post_comments").insert({ post_id: postId, user_id: user.id, body });
      if (error) throw error;
      setDraft("");
      await Promise.all([loadComments(), loadStats()]);
    } catch (error) { setNotice(error instanceof Error ? error.message : "No fue posible publicar el comentario."); }
    finally { setBusy(false); }
  }

  async function toggleComments() {
    const next = !open;
    setOpen(next);
    if (next) await loadComments();
  }

  return (
    <section className="mt-5 border-t border-[var(--border)] pt-4" aria-label="Interacciones de la publicación">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={()=>void toggleLike()} disabled={busy} aria-pressed={stats.liked_by_me} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition disabled:opacity-50 ${stats.liked_by_me?"bg-rose-500/10 text-rose-600":"bg-[var(--surface-secondary)] text-[var(--foreground)] hover:text-rose-600"}`}><Heart size={17} fill={stats.liked_by_me?"currentColor":"none"}/> {stats.liked_by_me?"Te gusta":"Me gusta"} · {stats.like_count}</button>
        <button type="button" onClick={()=>void toggleComments()} aria-expanded={open} className="inline-flex items-center gap-2 rounded-xl bg-[var(--surface-secondary)] px-3 py-2 text-sm font-bold text-[var(--foreground)] hover:text-[var(--primary)]"><MessageCircle size={17}/> Comentar · {stats.comment_count}</button>
        <button type="button" onClick={async()=>{const url=`${window.location.origin}/social#post-${postId}`;try{if(navigator.share)await navigator.share({title:"Publicación de Credi",url});else{await navigator.clipboard.writeText(url);setNotice("Enlace de la publicación copiado.");}}catch(error){if(error instanceof Error&&error.name!=="AbortError")setNotice("No fue posible compartir la publicación.");}}} className="inline-flex items-center gap-2 rounded-xl bg-[var(--surface-secondary)] px-3 py-2 text-sm font-bold text-[var(--foreground)] hover:text-[var(--primary)]"><Share2 size={17}/> Compartir</button>
      </div>
      {open && <div className="mt-4 space-y-4 rounded-2xl bg-[var(--surface-secondary)] p-4">
        <form onSubmit={submitComment} className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor={`comment-${postId}`}>Escribe un comentario</label>
          <input id={`comment-${postId}`} value={draft} onChange={(event)=>setDraft(event.target.value)} maxLength={2000} placeholder="Escribe un comentario…" className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--primary)]"/>
          <button type="submit" disabled={!draft.trim()||busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-black text-white disabled:opacity-50"><Send size={15}/> Enviar</button>
        </form>
        <div className="space-y-3">
          {comments.length ? comments.map((comment)=><article key={comment.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"><p className="text-sm leading-6">{comment.body}</p><p className="mt-2 text-[10px] text-[var(--muted)]">Miembro Credi · {new Date(comment.created_at).toLocaleString("es")}</p></article>) : <p className="text-xs text-[var(--muted)]">Todavía no hay comentarios. Inicia la conversación.</p>}
        </div>
      </div>}
      {notice && <p role="status" className="mt-3 text-xs text-[var(--muted)]">{notice}</p>}
    </section>
  );
}
