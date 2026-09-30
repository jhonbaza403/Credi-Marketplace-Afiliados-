import Link from "next/link";
import { ArrowRight, Camera, Megaphone, Play, Sparkles } from "lucide-react";
import { getDatabaseServerClient } from "@/lib/database/server";
import CrediSocialNav from "@/components/layout/CrediSocialNav";

type MediaItem = { type?: string; url?: string };

function mediaLabel(media: unknown): string | null {
  if (!Array.isArray(media)) return null;
  const first = media[0] as MediaItem | undefined;
  return first?.url && typeof first.url === "string" ? first.url : null;
}

export const metadata = {
  title: "Muro | Credi Marketplace",
  description: "Historias, reels, publicaciones y oportunidades comerciales de Credi Marketplace.",
};

export const dynamic = "force-dynamic";

export default async function SocialPage() {
  const supabase = await getDatabaseServerClient();
  const now = new Date().toISOString();

  const [postsResult, storiesResult, reelsResult, adsResult] = await Promise.all([
    supabase.from("feed_posts").select("id,title,body,media,published_at,created_at").eq("status", "published").eq("visibility", "public").order("created_at", { ascending: false }).limit(20),
    supabase.from("stories").select("id,body,media,expires_at,created_at").eq("visibility", "public").gt("expires_at", now).order("created_at", { ascending: false }).limit(20),
    supabase.from("reels").select("id,title,body,media,published_at,created_at").eq("status", "published").eq("visibility", "public").order("created_at", { ascending: false }).limit(20),
    supabase.from("advertisements").select("id,title,body,media,destination_url,starts_at,ends_at,created_at").eq("status", "active").or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gt.${now}`).order("created_at", { ascending: false }).limit(10),
  ]);

  const stories = storiesResult.data ?? [];
  const reels = reelsResult.data ?? [];
  const posts = postsResult.data ?? [];
  const ads = adsResult.data ?? [];
  const totalContent = stories.length + reels.length + posts.length;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 pb-8 text-[var(--foreground)] sm:px-4 lg:px-8">
      <CrediSocialNav active="wall" />
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="bg-gradient-to-br from-brand-950 via-slate-950 to-slate-900 px-6 py-9 text-white sm:px-10 sm:py-12">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[.16em] text-cyan-100"><Sparkles className="size-4" /> Muro Credi</span>
                <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Descubre lo que está pasando.</h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">Un muro orientado a comunidad y comercio: historias rápidas, reels, publicaciones y campañas activas, todo conectado a acciones reales.</p>
              </div>
              <Link href="/publish" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-black shadow-lg hover:bg-brand-400">Publicar <ArrowRight className="size-4" /></Link>
            </div>
          </div>
          <div className="grid grid-cols-2 border-t border-[var(--border)] sm:grid-cols-4">
            {[
              ["Historias", stories.length],
              ["Reels", reels.length],
              ["Publicaciones", posts.length],
              ["Contenido", totalContent],
            ].map(([label, value]) => (
              <div key={String(label)} className="border-b border-[var(--border)] px-5 py-4 last:border-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                <p className="text-[11px] font-black uppercase tracking-[.14em] text-[var(--muted)]">{label}</p>
                <p className="mt-1 text-2xl font-black text-[var(--foreground)]">{value}</p>
              </div>
            ))}
          </div>
        </header>

        <section aria-labelledby="stories-title">
          <div className="mb-4 flex items-end justify-between">
            <div><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--primary)]">Ahora</p><h2 id="stories-title" className="mt-1 text-2xl font-black">Historias</h2></div>
            <span className="text-xs font-semibold text-[var(--muted)]">24 horas</span>
          </div>
          {storiesResult.error ? <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">Las historias no están disponibles ahora.</p> : stories.length ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {stories.map((story) => {
                const media = mediaLabel(story.media);
                return <article key={story.id} className="min-w-[220px] flex-1 overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="aspect-[4/5] bg-gradient-to-br from-brand-500/20 via-[var(--surface-secondary)] to-cyan-500/10">
                    {media ? <img src={media} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center gap-2 p-5 text-center"><Camera className="size-8 text-[var(--primary)]" /><span className="text-sm font-bold">Historia de la comunidad</span></div>}
                  </div>
                  <div className="p-4"><p className="line-clamp-3 text-sm font-semibold leading-6">{story.body || "Nueva historia en Credi."}</p><p className="mt-3 text-[11px] font-semibold text-[var(--muted)]">Expira {new Date(story.expires_at).toLocaleString()}</p></div>
                </article>;
              })}
            </div>
          ) : <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-7 text-sm text-[var(--muted)]">Aún no hay historias públicas. Sé de los primeros en publicar.</p>}
        </section>

        <section aria-labelledby="feed-title" className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="mb-4"><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--primary)]">Feed</p><h2 id="feed-title" className="mt-1 text-2xl font-black">Publicaciones y reels</h2></div>
            <div className="space-y-5">
              {reels.map((reel) => {
                const media = mediaLabel(reel.media);
                return <article key={`reel-${reel.id}`} className="overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] shadow-sm">
                  <div className="aspect-video bg-[var(--surface-secondary)]">{media ? <video className="h-full w-full object-cover" controls preload="metadata" src={media} /> : <div className="flex h-full items-center justify-center gap-2 text-sm font-semibold text-[var(--muted)]"><Play className="size-5" /> Reel sin multimedia</div>}</div>
                  <div className="p-6"><span className="text-[11px] font-black uppercase tracking-[.14em] text-[var(--primary)]">Reel</span><h3 className="mt-2 text-xl font-black">{reel.title || "Reel de la comunidad"}</h3><p className="mt-2 text-sm leading-7 text-[var(--muted)]">{reel.body || "Contenido comercial de la comunidad Credi."}</p></div>
                </article>;
              })}
              {posts.map((post) => {
                const media = mediaLabel(post.media);
                return <article key={`post-${post.id}`} className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
                  <span className="text-[11px] font-black uppercase tracking-[.14em] text-[var(--primary)]">Publicación</span>
                  <h3 className="mt-2 text-xl font-black">{post.title || "Publicación de la comunidad"}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{post.body}</p>
                  {media && <a className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--surface-secondary)] px-4 py-2.5 text-sm font-bold text-[var(--primary)] hover:opacity-80" href={media} target="_blank" rel="noreferrer">Abrir multimedia <ArrowRight className="size-4" /></a>}
                </article>;
              })}
              {!reels.length && !posts.length && <div className="rounded-[1.75rem] border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center"><p className="text-lg font-black">Tu muro está listo.</p><p className="mt-2 text-sm text-[var(--muted)]">Cuando la comunidad publique, el contenido aparecerá aquí automáticamente.</p><Link href="/publish" className="mt-5 inline-flex rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white">Publicar ahora</Link></div>}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[.15em] text-[var(--primary)]">Acciones rápidas</p>
              <div className="mt-4 space-y-2">
                <Link href="/publish" className="flex items-center justify-between rounded-xl bg-[var(--surface-secondary)] px-4 py-3 text-sm font-black hover:opacity-80">Crear publicación <ArrowRight className="size-4" /></Link>
                <Link href="/marketplace" className="flex items-center justify-between rounded-xl bg-[var(--surface-secondary)] px-4 py-3 text-sm font-black hover:opacity-80">Explorar productos <ArrowRight className="size-4" /></Link>
                <Link href="/services" className="flex items-center justify-between rounded-xl bg-[var(--surface-secondary)] px-4 py-3 text-sm font-black hover:opacity-80">Buscar servicios <ArrowRight className="size-4" /></Link>
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-[var(--primary)]/20 bg-[var(--primary)]/[.05] p-6">
              <div className="flex items-center gap-2 text-[var(--primary)]"><Megaphone className="size-5" /><span className="text-xs font-black uppercase tracking-[.14em]">Oportunidades</span></div>
              <h3 className="mt-3 text-xl font-black">Publicidad activa</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{ads.length ? `${ads.length} campaña${ads.length === 1 ? "" : "s"} disponible${ads.length === 1 ? "" : "s"} ahora.` : "No hay campañas activas en este momento."}</p>
              {ads[0]?.destination_url && <a href={ads[0].destination_url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">Ver oportunidad <ArrowRight className="size-4" /></a>}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
