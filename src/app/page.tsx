import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, LockKeyhole, MessageCircle, Radio, ShoppingBag, Sparkles, TrendingUp, Users } from "lucide-react";
import HeroPortal from "@/components/layout/HeroPortal";
import { getProducts } from "@/lib/database/queries";
import "@/styles/hero-portal.css";

type Item = { title: string; description: string; href: string; icon: React.ReactNode };

const highlights: Item[] = [
  { title: "Marketplace", description: "Descubre productos y oportunidades comerciales B2C.", href: "/marketplace", icon: <ShoppingBag /> },
  { title: "B2B empresarial", description: "Conecta con empresas, proveedores y compras mayoristas.", href: "/b2b", icon: <Building2 /> },
  { title: "Credi Chat", description: "Comunícate, negocia y comparte información comercial.", href: "/chat", icon: <MessageCircle /> },
  { title: "Proveedores verificados", description: "Opera dentro de un ecosistema con controles de confianza.", href: "/proveedores-verificados", icon: <BadgeCheck /> },
];

function Highlight({ item }: { item: Item }) {
  return (
    <Link href={item.href} className="group premium-highlight block rounded-2xl p-5 transition hover:-translate-y-1 hover:shadow-marketplace-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
      <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">{item.icon}</span>
      <h3 className="text-base font-black text-[var(--foreground)]">{item.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.description}</p>
    </Link>
  );
}

export default async function HomePage() {
  let productCount = 0;
  try {
    productCount = (await getProducts(8)).length;
  } catch {
    productCount = 0;
  }

  const pulse = [
    { label: "Marketplace", value: productCount > 0 ? "Activo" : "Listo para publicar", icon: <ShoppingBag className="size-4" /> },
    { label: "Comercio B2B", value: "Conectado", icon: <Building2 className="size-4" /> },
    { label: "Credi Chat", value: "Disponible", icon: <MessageCircle className="size-4" /> },
    { label: "Ecosistema", value: "En evolución", icon: <TrendingUp className="size-4" /> },
  ];

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="hero-stage premium-portal-stage px-4 py-16 text-white sm:px-6 sm:py-24 lg:py-28">
        <HeroPortal />
        <div className="hero-content mx-auto grid w-full max-w-7xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.95fr)] lg:gap-12">
          <div className="max-w-3xl">
            <div className="hero-kicker inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-white/[.07] px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,.12)]">
              <Sparkles className="size-4" /> La red social del comercio
            </div>
            <h1 className="mt-7 max-w-3xl text-balance text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
              <span className="hero-main-text">Personas, contenido y oportunidades.</span>{" "}
              <span className="hero-highlight">Todo conecta en Credi.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-slate-100 drop-shadow-[0_2px_12px_rgba(0,0,0,.8)] sm:text-lg">
              Una comunidad para descubrir, conversar, publicar, vender y crecer. Tu muro social y tu comercio viven en la misma experiencia.
            </p>
            <div className="hero-actions mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/social" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-400 px-6 py-3.5 text-sm font-black text-slate-950 shadow-[0_10px_38px_rgba(34,211,238,.2)] transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                Entrar al muro <ArrowRight className="size-5" />
              </Link>
              <Link href="/marketplace" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[.07] px-6 py-3.5 text-sm font-black text-white backdrop-blur-sm transition hover:bg-white/[.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
                Explorar Marketplace <ShoppingBag className="size-4" />
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-300">
              <span className="inline-flex items-center gap-2"><Users className="size-4 text-cyan-200" /> Comunidad</span>
              <span className="inline-flex items-center gap-2"><Radio className="size-4 text-cyan-200" /> LIVE Commerce</span>
              <span className="inline-flex items-center gap-2"><Building2 className="size-4 text-cyan-200" /> B2B y afiliados</span>
            </div>
          </div>
          <div className="relative mx-auto mt-2 aspect-[4/3] w-full max-w-[640px] overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_28px_90px_rgba(2,6,23,.48)] sm:mt-0">
            <Image
              src="/visuals/credi-social-network.svg"
              alt="Ilustración del ecosistema social de Credi: publicaciones, comunidad y comercio conectado."
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-white/10" />
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-5 sm:px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 sm:grid-cols-4">
          {pulse.map((item) => (
            <div key={item.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.12em] text-[var(--muted)]">{item.icon}{item.label}</div>
              <p className="mt-2 text-sm font-black text-[var(--foreground)]">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="premium-portal-strip border-y border-[var(--border)] bg-[var(--surface)] py-12 sm:py-16">
        <div className="container-marketplace">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-black text-brand-700 dark:bg-brand-950 dark:text-brand-300">Ecosistema Credi</span>
            <h2 className="mt-4 text-2xl font-black text-[var(--foreground)] sm:text-4xl">Un inicio que te lleva directo a lo que necesitas</h2>
            <p className="mt-4 leading-7 text-[var(--muted)]">Accede rápidamente a comunidad, comercio, afiliación, LIVE y empresas sin salir de la misma experiencia Credi.</p>
          </div>
          <div className="mx-auto mt-8 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">{highlights.map((item) => <Highlight key={item.title} item={item} />)}</div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.4fr_.8fr]">
          <Link href="/social" className="group rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-black uppercase tracking-[.16em] text-[var(--primary)]">Muro Credi</span>
                <h2 className="mt-2 text-2xl font-black text-[var(--foreground)] sm:text-3xl">Contenido que también mueve comercio</h2>
              </div>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-secondary)] text-[var(--primary)]"><MessageCircle className="size-5" /></span>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">Historias, publicaciones, reels y oportunidades comerciales en un solo muro.</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">Entrar al muro <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
          </Link>
          <Link href="/free" className="rounded-[2rem] border border-brand-500/20 bg-gradient-to-br from-brand-50 to-[var(--surface)] p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:from-brand-950/40">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-black text-brand-700 dark:bg-white/10 dark:text-brand-200"><Users className="size-4" /> Credi Free</span>
            <h2 className="mt-4 text-2xl font-black text-[var(--foreground)]">Empieza gratis y crece cuando lo necesites</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">La experiencia básica permanece disponible sin convertir al creador o administrador en un plan comercial.</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">Conocer capacidades <ArrowRight className="size-4" /></span>
          </Link>
        </div>
      </section>

      <section className="premium-portal-footer px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
        <div className="container-marketplace rounded-[2rem] border border-white/10 bg-neutral-950 px-6 py-10 text-center text-white shadow-2xl sm:px-12 sm:py-12">
          <div className="mx-auto flex max-w-4xl flex-col items-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10"><LockKeyhole className="size-5 text-cyan-200" /></div>
            <h2 className="text-2xl font-black sm:text-4xl">Confianza, comercio y conexión</h2>
            <p className="mt-4 max-w-2xl leading-7 text-neutral-300">Crea tu cuenta para acceder a tu espacio de trabajo, operaciones y herramientas de Credi Marketplace.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-7 py-3.5 text-sm font-black hover:bg-brand-500">Crear cuenta</Link>
              <Link href="/chat" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-black hover:bg-white/10"><MessageCircle className="size-4" /> Credi Chat</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
