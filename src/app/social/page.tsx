import Link from "next/link";
import { getDatabaseServerClient } from "@/lib/database/server";

type MediaItem = { type?: string; url?: string };

function mediaLabel(media: unknown): string | null {
  if (!Array.isArray(media)) return null;
  const first = media[0] as MediaItem | undefined;
  return first?.url && typeof first.url === "string" ? first.url : null;
}

export const metadata = {
  title: "Social | Credi Marketplace",
  description: "Historias, reels, publicaciones y publicidad de Credi Marketplace.",
};

export default async function SocialPage() {
  const supabase = await getDatabaseServerClient();
  const now = new Date().toISOString();

  const [postsResult, storiesResult, reelsResult, adsResult] = await Promise.all([
    supabase.from("feed_posts").select("id,title,body,media,published_at,created_at").eq("status", "published").eq("visibility", "public").order("created_at", { ascending: false }).limit(20),
    supabase.from("stories").select("id,body,media,expires_at,created_at").eq("visibility", "public").gt("expires_at", now).order("created_at", { ascending: false }).limit(20),
    supabase.from("reels").select("id,title,body,media,published_at,created_at").eq("status", "published").eq("visibility", "public").order("created_at", { ascending: false }).limit(20),
    supabase.from("advertisements").select("id,title,body,media,destination_url,starts_at,ends_at,created_at").eq("status", "active").or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gt.${now}`).order("created_at", { ascending: false }).limit(10),
  ]);

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <header className="rounded-3xl border border-border bg-card p-7 shadow-sm sm:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Comunidad Credi</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Historias, reels y publicaciones</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Contenido público separado por cuenta. Las historias expiran en 24 horas y los anuncios activos se muestran en su propia sección.</p>
            </div>
            <Link href="/publish" className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90">Publicar contenido</Link>
          </div>
        </header>

        <section aria-labelledby="stories-title">
          <div className="mb-4 flex items-center justify-between"><h2 id="stories-title" className="text-xl font-black text-foreground">Historias</h2><span className="text-xs text-muted-foreground">24 horas</span></div>
          {storiesResult.error ? <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Las historias no están disponibles ahora.</p> : storiesResult.data?.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {storiesResult.data.map((story) => <article key={story.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm leading-6 text-foreground">{story.body}</p><p className="mt-4 text-xs text-muted-foreground">Expira: {new Date(story.expires_at).toLocaleString()}</p></article>)}
            </div>
          ) : <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Aún no hay historias públicas.</p>}
        </section>

        <section aria-labelledby="reels-title">
          <h2 id="reels-title" className="mb-4 text-xl font-black text-foreground">Reels</h2>
          {reelsResult.error ? <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Los reels no están disponibles ahora.</p> : reelsResult.data?.length ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {reelsResult.data.map((reel) => { const media = mediaLabel(reel.media); return <article key={reel.id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"><div className="aspect-video bg-muted">{media ? <video className="h-full w-full object-cover" controls preload="metadata" src={media} /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Reel sin multimedia</div>}</div><div className="p-5"><h3 className="font-black text-foreground">{reel.title || "Reel de la comunidad"}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{reel.body}</p></div></article>; })}
            </div>
          ) : <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Aún no hay reels públicos.</p>}
        </section>

        <section aria-labelledby="posts-title">
          <h2 id="posts-title" className="mb-4 text-xl font-black text-foreground">Publicaciones</h2>
          {postsResult.error ? <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Las publicaciones no están disponibles ahora.</p> : postsResult.data?.length ? <div className="space-y-4">{postsResult.data.map((post) => <article key={post.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm"><h3 className="font-black text-foreground">{post.title || "Publicación"}</h3><p className="mt-2 text-sm leading-7 text-foreground">{post.body}</p>{mediaLabel(post.media) && <a className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline" href={mediaLabel(post.media) ?? "#"} target="_blank" rel="noreferrer">Abrir multimedia</a>}</article>)}</div> : <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Aún no hay publicaciones públicas.</p>}
        </section>

        <section aria-labelledby="ads-title">
          <div className="mb-4 flex items-center justify-between"><h2 id="ads-title" className="text-xl font-black text-foreground">Publicidad</h2><span className="text-xs text-muted-foreground">Anuncios activos</span></div>
          {adsResult.error ? <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">La publicidad no está disponible ahora.</p> : adsResult.data?.length ? <div className="grid gap-5 lg:grid-cols-2">{adsResult.data.map((ad) => <article key={ad.id} className="rounded-3xl border border-primary/20 bg-primary/[0.04] p-6"><p className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">Publicidad</p><h3 className="mt-2 text-xl font-black text-foreground">{ad.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{ad.body}</p>{ad.destination_url && <a href={ad.destination_url} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Ver anuncio</a>}</article>)}</div> : <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">No hay campañas publicitarias activas.</p>}
        </section>
      </div>
    </main>
  );
}
