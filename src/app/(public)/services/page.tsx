import type { Metadata } from "next";
import Link from "next/link";
import DomainBridge from "@/components/portal/DomainBridge";
import CrediServicePortalNav from '@/components/portal/CrediServicePortalNav'
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Headset,
  MessageCircle,
  Radio,
  Share2,
  ShoppingBag,
  Sparkles,
  Wallet,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Servicios | Credi Marketplace",
  description: "Accede a las herramientas sociales, comerciales y empresariales de Credi desde un solo portal.",
};

const services = [
  {
    title: "Muro y publicaciones",
    description: "Comparte novedades, historias, reels y oportunidades con tu comunidad.",
    detail: "Comunidad",
    href: "/social",
    icon: Users,
    tone: "from-cyan-400/20 to-blue-500/5",
  },
  {
    title: "Marketplace",
    description: "Descubre productos y presenta tus ofertas con información clara.",
    detail: "Compra y venta",
    href: "/marketplace",
    icon: ShoppingBag,
    tone: "from-violet-400/20 to-fuchsia-500/5",
  },
  {
    title: "Credi Chat",
    description: "Conversa, consulta y continúa negociaciones en un solo hilo.",
    detail: "Mensajería",
    href: "/chat",
    icon: MessageCircle,
    tone: "from-emerald-400/20 to-teal-500/5",
  },
  {
    title: "Credi LIVE",
    description: "Conecta sesiones en directo con chat y productos asociados.",
    detail: "Vídeo en directo",
    href: "/live",
    icon: Radio,
    tone: "from-rose-400/20 to-orange-500/5",
  },
  {
    title: "Afiliados",
    description: "Solicita acceso al programa y gestiona enlaces y atribuciones.",
    detail: "Recomendaciones",
    href: "/affiliate",
    icon: Share2,
    tone: "from-amber-400/20 to-yellow-500/5",
  },
  {
    title: "B2B y mayoristas",
    description: "Conecta con empresas y explora oportunidades de compra al mayor.",
    detail: "Empresas",
    href: "/b2b",
    icon: Building2,
    tone: "from-sky-400/20 to-indigo-500/5",
  },
  {
    title: "Empleo y talento",
    description: "Publica oportunidades, encuentra profesionales y gestiona tu perfil laboral.",
    detail: "Red profesional",
    href: "/jobs",
    icon: BriefcaseBusiness,
    tone: "from-blue-400/20 to-cyan-500/5",
  },
  {
    title: "Credi Free",
    description: "Entra a la experiencia comunitaria y descubre las áreas disponibles.",
    detail: "Acceso gratuito",
    href: "/free",
    icon: Sparkles,
    tone: "from-fuchsia-400/20 to-violet-500/5",
  },
  {
    title: "Pedidos y pagos",
    description: "Consulta tus pedidos y continúa el proceso de compra seguro.",
    detail: "Operaciones",
    href: "/orders",
    icon: Wallet,
    tone: "from-lime-400/20 to-emerald-500/5",
  },
];

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-9">
        <DomainBridge context="services" />
        <CrediServicePortalNav />

        <section className="relative isolate overflow-hidden rounded-[2rem] border border-indigo-300/15 bg-[linear-gradient(125deg,#09172d_0%,#17153c_58%,#102e3c_100%)] px-5 py-9 text-white shadow-[0_26px_80px_rgba(2,8,28,.24)] sm:px-9 sm:py-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-cyan-300/15 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-1/4 size-72 rounded-full bg-violet-400/15 blur-3xl" />
          <div className="relative max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-white/[.07] px-3 py-1.5 text-xs font-black uppercase tracking-[.17em] text-cyan-100">
              <BriefcaseBusiness className="size-4" /> Centro de servicios Credi
            </span>
            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">Todo lo que necesitas, a un acceso de distancia.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">
              Comunidad, comercio, comunicación y herramientas empresariales dentro de una sola experiencia. Entra directamente al área que necesitas y conserva el contexto de tu cuenta.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/social" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200">Ir al Muro <ArrowRight className="size-4" /></Link>
              <Link href="/publish" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/[.07] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[.13]">Crear contenido <Sparkles className="size-4" /></Link>
            </div>
          </div>
          <div className="relative mt-8 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
            <div className="flex items-center gap-3 text-sm font-bold text-slate-200"><Users className="size-5 text-cyan-200" /> Conecta con tu comunidad</div>
            <div className="flex items-center gap-3 text-sm font-bold text-slate-200"><ShoppingBag className="size-5 text-violet-200" /> Descubre oportunidades</div>
            <div className="flex items-center gap-3 text-sm font-bold text-slate-200"><Headset className="size-5 text-emerald-200" /> Continúa conversaciones</div>
          </div>
        </section>

        <section aria-labelledby="services-title" className="py-9 sm:py-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-[var(--primary)]">Explora Credi</p>
              <h2 id="services-title" className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Servicios y herramientas</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Nueve accesos principales, cada uno conectado con su área de la plataforma.</p>
            </div>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-bold text-[var(--muted)]">Un portal · Una cuenta</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {services.map(({ title, description, detail, href, icon: Icon, tone }) => (
              <Link key={title} href={href} className={`group flex min-h-[230px] flex-col rounded-[1.6rem] border border-[var(--border)] bg-gradient-to-br ${tone} p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 sm:p-6`}>
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-12 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--primary)] shadow-sm"><Icon className="size-5" /></span>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">{detail}</span>
                </div>
                <h3 className="mt-5 text-lg font-black tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
                <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-black text-[var(--primary)]">Abrir servicio <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
