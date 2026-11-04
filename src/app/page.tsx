import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  Camera,
  CirclePlay,
  Compass,
  HeartHandshake,
  MessageCircle,
  Megaphone,
  Radio,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { getDatabaseServerClient } from "@/lib/database/server";
import { isPlaywrightSupabasePlaceholder } from "@/lib/database/test-runtime";

export const dynamic = "force-dynamic";

type Module = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accent: string;
  tint: string;
};

const modules: Module[] = [
  { title: "Muro social", description: "Publica, conversa y descubre historias de la comunidad.", href: "/social", icon: Users, accent: "#7356ed", tint: "#f0edff" },
  { title: "Marketplace", description: "Explora productos, tiendas y oportunidades comerciales.", href: "/marketplace", icon: ShoppingBag, accent: "#0a9dca", tint: "#e7f8ff" },
  { title: "Publicar", description: "Comparte contenido, historias, reels o campañas.", href: "/publish", icon: Camera, accent: "#d44db1", tint: "#fff0fa" },
  { title: "Credi Chat", description: "Mantén tus conversaciones y acuerdos en un solo lugar.", href: "/chat", icon: MessageCircle, accent: "#11a879", tint: "#e8fbf4" },
  { title: "Credi LIVE", description: "Conecta con tu audiencia mediante comercio en vivo.", href: "/live", icon: Radio, accent: "#ef476f", tint: "#fff0f3" },
  { title: "Afiliados", description: "Descubre oportunidades y gestiona tu actividad afiliada.", href: "/affiliate", icon: TrendingUp, accent: "#c17a20", tint: "#fff7e8" },
  { title: "B2B empresarial", description: "Conecta con compradores, proveedores y mayoristas.", href: "/b2b", icon: Building2, accent: "#3c72d8", tint: "#edf4ff" },
  { title: "Credi Free", description: "Conoce las capacidades disponibles para comenzar.", href: "/free", icon: Sparkles, accent: "#8c5dd8", tint: "#f5efff" },
  { title: "Servicios", description: "Encuentra profesionales y soluciones del ecosistema.", href: "/services", icon: BadgeCheck, accent: "#1b9b93", tint: "#e8f9f7" },
  { title: "Mi billetera", description: "Consulta las herramientas de pagos y movimientos.", href: "/wallet", icon: Wallet, accent: "#a07a22", tint: "#fff8e7" },
  { title: "Analytics", description: "Revisa indicadores y rendimiento de tu actividad.", href: "/analytics", icon: BarChart3, accent: "#5371d9", tint: "#eff2ff" },
  { title: "Seguridad", description: "Accede a las opciones de protección de tu cuenta.", href: "/security", icon: ShieldCheck, accent: "#178c68", tint: "#e9f9f2" },
];

function MetricCard({ label, value, hint, icon: Icon }: { label: string; value: number | null; hint: string; icon: LucideIcon }) {
  return (
    <div className="credi-dashboard-card flex min-w-0 items-center gap-3 rounded-2xl p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]"><Icon className="size-5" aria-hidden="true" /></span>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-black uppercase tracking-[.13em] text-[var(--muted)]">{label}</p>
        <p className="mt-0.5 text-xl font-black tracking-tight text-[var(--foreground)]">{value === null ? "—" : value.toLocaleString("es-ES")}</p>
        <p className="truncate text-[10px] text-[var(--muted)]">{hint}</p>
      </div>
    </div>
  );
}

export default async function HomePage() {
  let productCount: number | null = null;
  let postCount: number | null = null;
  let storyCount: number | null = null;

  if (!isPlaywrightSupabasePlaceholder(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  )) {
    try {
      const supabase = await getDatabaseServerClient();
      const now = new Date().toISOString();
      const [products, posts, stories] = await Promise.all([
        supabase.from("published_products").select("id", { count: "exact", head: true }),
        supabase.from("feed_posts").select("id", { count: "exact", head: true }).eq("status", "published").eq("visibility", "public"),
        supabase.from("stories").select("id", { count: "exact", head: true }).eq("visibility", "public").gt("expires_at", now),
      ]);
      if (!products.error) productCount = products.count ?? 0;
      if (!posts.error) postCount = posts.count ?? 0;
      if (!stories.error) storyCount = stories.count ?? 0;
    } catch {
      // A missing or temporarily unavailable data source must not break the portal.
    }
  }

  return (
    <main className="credi-dashboard-home min-h-screen px-3 pb-12 pt-5 text-[var(--foreground)] sm:px-5 lg:px-7 lg:pt-7">
      <div className="mx-auto max-w-[1500px] space-y-5 lg:space-y-7">
        <section className="credi-dashboard-hero rounded-[2rem] px-5 py-7 text-white sm:px-8 sm:py-9 lg:px-10 lg:py-11">
          <div className="relative z-10 grid items-center gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(330px,.82fr)] lg:gap-10">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-white/[.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-cyan-100">
                <Sparkles className="size-3.5" aria-hidden="true" /> Tu red social del comercio
              </span>
              <h1 className="mt-5 max-w-3xl text-balance text-3xl font-black leading-[1.06] tracking-tight text-white sm:text-4xl lg:text-5xl xl:text-[3.6rem]">
                Todo lo que necesitas para conectar, compartir y crecer.
                <span className="mt-2 block bg-gradient-to-r from-cyan-200 via-white to-violet-200 bg-clip-text text-transparent">Todo conecta en Credi.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-blue-50/85 sm:text-base">
                Tu comunidad y tu actividad comercial conviven en una sola experiencia: descubre, conversa, publica, vende y construye nuevas oportunidades.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/social" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:brightness-105">
                  Explorar el Muro <ArrowRight className="size-4" />
                </Link>
                <Link href="/marketplace" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[.08] px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/[.14]">
                  Ir al Marketplace <ShoppingBag className="size-4" />
                </Link>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-bold text-blue-100/80">
                <span className="inline-flex items-center gap-2"><Users className="size-4 text-cyan-200" /> Comunidad</span>
                <span className="inline-flex items-center gap-2"><Radio className="size-4 text-cyan-200" /> LIVE Commerce</span>
                <span className="inline-flex items-center gap-2"><Building2 className="size-4 text-cyan-200" /> B2B y afiliados</span>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-[570px]">
              <div className="credi-float relative aspect-[4/3] overflow-hidden rounded-[1.65rem] border border-white/15 bg-white/5 shadow-2xl shadow-black/30">
                <Image
                  src="/visuals/credi-social-network.svg"
                  alt="Ilustración del ecosistema Credi con comunidad, publicaciones y comercio conectado."
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-4 left-3 inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-slate-950/80 px-4 py-3 text-xs font-bold text-white shadow-xl backdrop-blur-xl sm:left-7">
                <Zap className="size-4 text-yellow-300" /> Una plataforma, múltiples oportunidades
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Actividad real de Credi" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricCard label="Productos disponibles" value={productCount} hint="Catálogo publicado" icon={ShoppingBag} />
          <MetricCard label="Publicaciones públicas" value={postCount} hint="Muro de la comunidad" icon={Users} />
          <MetricCard label="Historias activas" value={storyCount} hint="Contenido dentro de sus 24 horas" icon={Camera} />
        </section>

        <section className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-5">
            <section className="credi-dashboard-card rounded-[1.7rem] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-[var(--primary)]">Centro de creación</p>
                  <h2 className="mt-1 text-lg font-black tracking-tight text-[var(--foreground)] sm:text-xl">¿Qué quieres compartir hoy?</h2>
                </div>
                <Link href="/publish" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 px-4 py-2 text-xs font-black text-white shadow-lg shadow-violet-900/15 transition hover:-translate-y-0.5 hover:brightness-110">
                  Crear contenido <ArrowRight className="size-4" />
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: "Publicación", icon: Users },
                  { label: "Historia", icon: Camera },
                  { label: "Reel", icon: CirclePlay },
                  { label: "Publicidad", icon: Megaphone },
                ].map(({ label, icon: Icon }) => (
                  <Link key={label} href="/publish" className="flex min-h-12 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-3 text-xs font-bold text-[var(--foreground)] transition hover:border-[var(--primary)]/35 hover:bg-[var(--primary)]/[.06]">
                    <Icon className="size-4 text-[var(--primary)]" />{label}
                  </Link>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-5 text-[var(--muted)]">El contenido enviado puede requerir revisión antes de aparecer públicamente; podrás consultar su estado desde Credi.</p>
            </section>

            <section aria-labelledby="modules-title">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.17em] text-[var(--primary)]">Tu ecosistema</p>
                  <h2 id="modules-title" className="mt-1 text-2xl font-black tracking-tight text-[var(--foreground)] sm:text-3xl">Entra directo a cada espacio</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Accesos claros a las herramientas principales de Credi.</p>
                </div>
                <Link href="/services" className="inline-flex items-center gap-1 text-xs font-black text-[var(--primary)] hover:underline">Ver servicios <ArrowRight className="size-3.5" /></Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {modules.map(({ title, description, href, icon: Icon, accent, tint }) => (
                  <Link
                    key={href}
                    href={href}
                    style={{ "--module-accent": accent, "--module-tint": tint, "--module-glow": tint } as React.CSSProperties}
                    className="credi-module-card group flex min-h-[164px] flex-col rounded-[1.35rem] p-4 sm:min-h-[178px] sm:p-5"
                  >
                    <span className="credi-module-icon grid size-10 place-items-center rounded-xl transition duration-200 group-hover:rotate-[-5deg] group-hover:scale-110">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="mt-4 text-sm font-black leading-tight text-[var(--foreground)]">{title}</span>
                    <span className="mt-2 line-clamp-2 text-[11px] leading-5 text-[var(--muted)]">{description}</span>
                    <span className="mt-auto inline-flex items-center gap-1 pt-3 text-[10px] font-black text-[var(--primary)]">Abrir espacio <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" /></span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="credi-dashboard-card overflow-hidden rounded-[1.7rem]">
              <div className="bg-gradient-to-br from-[#211451] via-[#39217d] to-[#12618c] p-5 text-white">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-100">Credi LIVE</span>
                  <span className="credi-live-pulse rounded-md bg-rose-500 px-2 py-1 text-[9px] font-black text-white">LIVE</span>
                </div>
                <h2 className="mt-3 text-xl font-black leading-tight text-white">Conecta en tiempo real</h2>
                <p className="mt-2 text-xs leading-5 text-blue-50/80">Accede al estudio LIVE, configura tu emisión y revisa el estado de tu sala.</p>
                <Link href="/live" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-violet-900 transition hover:bg-cyan-100">Abrir LIVE <ArrowRight className="size-3.5" /></Link>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-cyan-50 text-cyan-700"><Radio className="size-4" /></span>
                  <div><p className="text-xs font-black text-[var(--foreground)]">Estudio de transmisión</p><p className="text-[10px] text-[var(--muted)]">RTMPS / SRT y replay</p></div>
                </div>
              </div>
            </section>

            <section className="credi-dashboard-card rounded-[1.7rem] p-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-800"><HeartHandshake className="size-3.5" /> Negocios</span>
              <h2 className="mt-3 text-lg font-black text-[var(--foreground)]">Crece más allá de tu tienda</h2>
              <p className="mt-2 text-xs leading-6 text-[var(--muted)]">Explora compras mayoristas, proveedores y oportunidades de colaboración.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href="/b2b" className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl bg-[var(--primary)] px-3 text-xs font-black text-white hover:brightness-110">Ir a B2B <ArrowRight className="size-3.5" /></Link>
                <Link href="/affiliate" className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-[var(--border)] px-3 text-xs font-black text-[var(--foreground)] hover:bg-[var(--surface-secondary)]">Afiliados <TrendingUp className="size-3.5" /></Link>
              </div>
            </section>

            <section className="credi-dashboard-card rounded-[1.7rem] p-5">
              <div className="flex items-center gap-2 text-[var(--primary)]"><Compass className="size-4" /><span className="text-[10px] font-black uppercase tracking-[.15em]">Explorar</span></div>
              <h2 className="mt-2 text-base font-black text-[var(--foreground)]">Encuentra lo que buscas</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Busca personas, productos y servicios dentro del ecosistema.</p>
              <Link href="/search" className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-3 text-xs font-semibold text-[var(--muted)] transition hover:border-[var(--primary)]/40">
                <Search className="size-4" /> Buscar en Credi <ArrowRight className="ml-auto size-3.5" />
              </Link>
            </section>
          </aside>
        </section>

        <section className="rounded-[1.8rem] border border-[var(--border)] bg-[var(--surface)] px-5 py-6 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-7">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[.17em] text-[var(--primary)]">Una sola comunidad</p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-[var(--foreground)] sm:text-2xl">Conecta. Publica. Compra. Vende. Crece.</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Tu siguiente paso está a un clic, tanto si vienes a compartir como si vienes a crear una oportunidad comercial.</p>
          </div>
          <div className="mt-5 flex shrink-0 flex-wrap gap-2 sm:mt-0">
            <Link href="/register" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 px-5 text-xs font-black text-white shadow-md transition hover:-translate-y-0.5 hover:brightness-110">Crear cuenta <ArrowRight className="size-4" /></Link>
            <Link href="/services" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-5 text-xs font-black text-[var(--foreground)] transition hover:bg-[var(--surface-secondary)]">Explorar servicios <Store className="size-4" /></Link>
          </div>
        </section>
      </div>
    </main>
  );
}
