import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, Camera, Megaphone, MessageCircle, Play, Radio, ShoppingBag, Sparkles, TrendingUp, Users } from "lucide-react";
import { getDatabaseServerClient } from "@/lib/database/server";
import { withOperationContext } from "@/lib/portal/operation-context";

type MediaItem = { type?: string; url?: string };
type OperationContextRecord = Record<string, unknown>;

function commerceActions(context: unknown) {
  if (!context || typeof context !== "object") return null;
  const value = context as OperationContextRecord;
  const productId = typeof value.product_id === "string" ? value.product_id : null;
  const affiliateRef = typeof value.affiliate_ref === "string" ? value.affiliate_ref : null;
  if (!productId) return null;
  const operation = { productId, affiliateRef, source: "wall" as const };
  return {
    product: withOperationContext(`/products/${encodeURIComponent(productId)}`, operation),
    chat: withOperationContext("/chat", operation),
    checkout: withOperationContext("/checkout", operation),
  };
}

function firstMedia(media: unknown): MediaItem | null {
  if (!Array.isArray(media)) return null;
  const first = media[0] as MediaItem | undefined;
  if (!first?.url || typeof first.url !== "string") return null;
  return {
    url: first.url,
    type: typeof first.type === "string" ? first.type : undefined,
  };
}

function MediaPreview({ media, alt = "" }: { media: unknown; alt?: string }) {
  const item = firstMedia(media);
  if (!item) return null;
  const url = item.url;
  if (!url) return null;

  if (item.type === "video" || url.match(/\.(mp4|webm|mov)(?:\?|$)/i)) {
    return (
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
        aria-label={alt || "Vídeo"}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} loading="lazy" className="h-full w-full object-cover" />
  );
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
    supabase.from("feed_posts").select("id,title,body,media,published_at,created_at,operation_context").eq("status", "published").eq("visibility", "public").order("created_at", { ascending: false }).limit(20),
    supabase.from("stories").select("id,body,media,expires_at,created_at,operation_context").eq("visibility", "public").gt("expires_at", now).order("created_at", { ascending: false }).limit(20),
    supabase.from("reels").select("id,title,body,media,published_at,created_at,operation_context").eq("status", "published").eq("visibility", "public").order("created_at", { ascending: false }).limit(20),
    supabase.from("advertisements").select("id,title,body,media,destination_url,starts_at,ends_at,created_at,operation_context").eq("status", "active").or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gt.${now}`).order("created_at", { ascending: false }).limit(10),
  ]);

  const stories = storiesResult.data ?? [];
  const reels = reelsResult.data ?? [];
  const posts = postsResult.data ?? [];
  const ads = adsResult.data ?? [];
  const totalContent = stories.length + reels.length + posts.length;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 pb-8 text-[var(--foreground)] sm:px-4 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-marketplace-xl">
          <div className="relative isolate overflow-hidden bg-gradient-to-br from-[#07152a] via-[#10112e] to-[#21113f] px-5 py-7 text-white sm:px-8 sm:py-10 lg:px-10 lg:py-11">
            <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-cyan-400/15 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-10 size-72 rounded-full bg-violet-400/15 blur-3xl" />
            <div className="relative grid items-center gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.72fr)]">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-white/[.07] px-3 py-1.5 text-xs font-black uppercase tracking-[.16em] text-cyan-100">
                  <Sparkles className="size-4" aria-hidden="true" /> Comunidad Credi
                </span>
                <h1 className="mt-4 text-white text-balance text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Tu comunidad. Tus ideas. Nuevas oportunidades.</h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">Historias, reels, publicaciones y campañas en un espacio creado para conectar personas y comercio. Descubre lo que pasa y participa.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/publish" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                    Crear publicación <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                  <Link href="/marketplace" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[.06] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[.12] focus-visible:outline-2 focus-visible:outline-cyan-300">
                    Descubrir productos <ShoppingBag className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
              <div className="relative mx-auto hidden aspect-[4/3] w-full max-w-[440px] overflow-hidden rounded-3xl border border-white/10 shadow-2xl md:block">
                <Image src="/visuals/credi-social-network.svg" alt="Vista ilustrativa del muro social y comercio integrado de Credi." fill priority sizes="(max-width: 1024px) 100vw, 38vw" className="object-cover" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 border-t border-[var(--border)] bg-[var(--surface)] sm:grid-cols-4">
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

        <nav aria-label="Accesos rápidos del ecosistema Credi" className="flex gap-2 overflow-x-auto pb-1">
          {[
            { label: "Muro", href: "/social", icon: Users },
            { label: "Marketplace", href: "/marketplace", icon: ShoppingBag },
            { label: "LIVE", href: "/live", icon: Radio },
            { label: "Afiliados", href: "/affiliate", icon: TrendingUp },
            { label: "B2B", href: "/b2b", icon: Building2 },
            { label: "Servicios", href: "/services", icon: BadgeCheck },
            { label: "Chat", href: "/chat", icon: MessageCircle },
          ].map((item) => {
            const Icon = item.icon;
            return <Link key={item.href} href={item.href} aria-current={item.href === "/social" ? "page" : undefined} className={"inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] " + (item.href === "/social" ? "border-[var(--primary)]/20 bg-[var(--primary)]/[.08] text-[var(--primary)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--primary)]/30 hover:bg-[var(--surface-secondary)]")}>
              <Icon className="size-4" aria-hidden="true" /> {item.label}
            </Link>;
          })}
        </nav>

              {ads.length > 0 && <section aria-labelledby="active-ads-title" className="rounded-[1.75rem] border border-[var(--primary)]/20 bg-[var(--surface)] p-6 shadow-sm">
                <div className="flex items-center gap-2 text-[var(--primary)]"><Megaphone className="size-5" /><span className="text-xs font-black uppercase tracking-[.14em]">Campañas</span></div>
                <h2 id="active-ads-title" className="mt-2 text-2xl font-black">Publicidad activa</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {ads.map((ad) => <article key={ad.id} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)]">
                    <div className="aspect-video overflow-hidden bg-[var(--surface)]"><MediaPreview media={ad.media} alt={ad.title} /></div>
                    <div className="p-4"><h3 className="font-black">{ad.title}</h3><p className="mt-1 line-clamp-3 text-sm text-[var(--muted)]">{ad.body || "Oportunidad comercial en Credi."}</p>
                      <div className="mt-4 flex flex-wrap gap-2">{ad.destination_url && <a href={ad.destination_url} target="_blank" rel="noreferrer" className="rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-black text-white">Ver campaña</a>}{commerceActions(ad.operation_context) && <Link href={commerceActions(ad.operation_context)!.product} className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-black">Ver producto</Link>}</div>
                    </div>
                  </article>)}
                </div>
              </section>}

        <section aria-labelledby="stories-title">
          <div className="mb-4 flex items-end justify-between">
            <div><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--primary)]">Ahora</p><h2 id="stories-title" className="mt-1 text-2xl font-black">Historias</h2></div>
            <span className="text-xs font-semibold text-[var(--muted)]">24 horas</span>
          </div>
          {storiesResult.error ? <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">Las historias no están disponibles ahora.</p> : stories.length ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {stories.map((story) => {
                const media = firstMedia(story.media);
                return <article key={story.id} className="min-w-[220px] flex-1 overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="aspect-[4/5] bg-gradient-to-br from-brand-500/20 via-[var(--surface-secondary)] to-cyan-500/10">
                    {media ? <MediaPreview media={[media]} alt="Historia de Credi" /> : <div className="flex h-full flex-col items-center justify-center gap-2 p-5 text-center"><Camera className="size-8 text-[var(--primary)]" /><span className="text-sm font-bold">Historia de la comunidad</span></div>}
                  </div>
                  <div className="p-4"><p className="line-clamp-3 text-sm font-semibold leading-6">{story.body || "Nueva historia en Credi."}</p><p className="mt-3 text-[11px] font-semibold text-[var(--muted)]">Expira {new Date(story.expires_at).toLocaleString()}</p></div>
                </article>;
              })}
            </div>
          ) : <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-7 text-sm text-[var(--muted)]">Aún no hay historias públicas. Sé de los primeros en publicar.</p>}
        </section>

        <section aria-labelledby="feed-title" className="grid gap-7 lg:grid-cols-[220px_minmax(0,1fr)_320px]">
          <aside className="hidden space-y-4 lg:block">
            <div className="sticky top-20 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
              <p className="px-2 text-[11px] font-black uppercase tracking-[.15em] text-[var(--muted)]">Tu espacio</p>
              <div className="mt-3 space-y-1">
                <Link href="/" className="flex items-center rounded-xl px-3 py-2.5 text-sm font-black hover:bg-[var(--surface-secondary)]">Inicio</Link>
                <Link href="/marketplace" className="flex items-center rounded-xl px-3 py-2.5 text-sm font-black hover:bg-[var(--surface-secondary)]">Marketplace</Link>
                <Link href="/services" className="flex items-center rounded-xl px-3 py-2.5 text-sm font-black hover:bg-[var(--surface-secondary)]">Servicios</Link>
                <Link href="/chat" className="flex items-center rounded-xl px-3 py-2.5 text-sm font-black hover:bg-[var(--surface-secondary)]">Credi Chat</Link>
                <Link href="/free" className="flex items-center rounded-xl bg-[var(--primary)]/[.08] px-3 py-2.5 text-sm font-black text-[var(--primary)]">Credi Free</Link>
              </div>
              <div className="mt-4 border-t border-[var(--border)] pt-4">
                <Link href="/publish" className="flex w-full items-center justify-center rounded-xl bg-[var(--primary)] px-3 py-2.5 text-xs font-black text-white shadow-sm">Crear publicación</Link>
              </div>
            </div>
          </aside>
          <div>
            <div className="mb-4"><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--primary)]">Feed</p><h2 id="feed-title" className="mt-1 text-2xl font-black">Publicaciones y reels</h2></div>
            <div className="space-y-5">
              {reels.map((reel) => {
                const media = firstMedia(reel.media);
                return <article key={`reel-${reel.id}`} className="overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] shadow-sm">
                  <div className="aspect-video bg-[var(--surface-secondary)]">{media ? <MediaPreview media={[media]} alt={reel.title || "Reel de Credi"} /> : <div className="flex h-full items-center justify-center gap-2 text-sm font-semibold text-[var(--muted)]"><Play className="size-5" /> Reel sin multimedia</div>}</div>
                  <div className="p-6"><span className="text-[11px] font-black uppercase tracking-[.14em] text-[var(--primary)]">Reel</span><h3 className="mt-2 text-xl font-black">{reel.title || "Reel de la comunidad"}</h3><p className="mt-2 text-sm leading-7 text-[var(--muted)]">{reel.body || "Contenido comercial de la comunidad Credi."}</p>{commerceActions(reel.operation_context) && <div className="mt-5 flex flex-wrap gap-2"><Link href={commerceActions(reel.operation_context)!.product} className="rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-black text-white">Ver producto</Link><Link href={commerceActions(reel.operation_context)!.chat} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-black">Contactar</Link><Link href={commerceActions(reel.operation_context)!.checkout} className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-700">Comprar</Link></div>}</div>
                </article>;
              })}
              {posts.map((post) => {
                const media = firstMedia(post.media);
                return <article key={`post-${post.id}`} className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
                  <span className="text-[11px] font-black uppercase tracking-[.14em] text-[var(--primary)]">Publicación</span>
                  <h3 className="mt-2 text-xl font-black">{post.title || "Publicación de la comunidad"}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{post.body}</p>{media && <div className="mt-5 aspect-video overflow-hidden rounded-2xl bg-[var(--surface-secondary)]"><MediaPreview media={[media]} alt={post.title || "Publicación de Credi"} /></div>}{commerceActions(post.operation_context) && <div className="mt-5 flex flex-wrap gap-2"><Link href={commerceActions(post.operation_context)!.product} className="rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-black text-white">Ver producto</Link><Link href={commerceActions(post.operation_context)!.chat} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-black">Contactar</Link><Link href={commerceActions(post.operation_context)!.checkout} className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-700">Comprar</Link></div>}
                  {media && <a className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--surface-secondary)] px-4 py-2.5 text-sm font-bold text-[var(--primary)] hover:opacity-80" href={media.url} target="_blank" rel="noreferrer">Abrir multimedia <ArrowRight className="size-4" /></a>}
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
              {(ads[0]?.destination_url || commerceActions(ads[0]?.operation_context)) && <div className="mt-5 flex flex-wrap gap-2">{ads[0]?.destination_url && <a href={ads[0].destination_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">Ver oportunidad <ArrowRight className="size-4" /></a>}{commerceActions(ads[0]?.operation_context) && <Link href={commerceActions(ads[0]?.operation_context)!.product} className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">Ver producto <ArrowRight className="size-4" /></Link>}</div>}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
