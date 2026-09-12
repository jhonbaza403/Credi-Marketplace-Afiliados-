import Link from 'next/link'
import { ArrowRight, BadgeCheck, Building2, Globe2, LockKeyhole, MessageCircle, ShoppingBag, Sparkles, Store } from 'lucide-react'
import HeroPortal from '@/components/layout/HeroPortal'
import '@/styles/hero-portal.css'

type Item = { title: string; description: string; href: string; icon: React.ReactNode }

const highlights: Item[] = [
  { title: 'Marketplace', description: 'Descubre productos y oportunidades comerciales B2C.', href: '/marketplace', icon: <ShoppingBag /> },
  { title: 'B2B empresarial', description: 'Conecta con empresas, proveedores y compras mayoristas.', href: '/b2b', icon: <Building2 /> },
  { title: 'Credi Chat', description: 'Comunícate, negocia y comparte información comercial.', href: '/chat', icon: <MessageCircle /> },
  { title: 'Proveedores verificados', description: 'Opera dentro de un ecosistema con controles de confianza.', href: '/proveedores-verificados', icon: <BadgeCheck /> },
]

function Highlight({ item }: { item: Item }) {
  return (
    <Link href={item.href} className="group premium-highlight block rounded-2xl p-5 transition hover:-translate-y-1 hover:shadow-marketplace-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
      <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">{item.icon}</span>
      <h3 className="text-base font-black text-[var(--foreground)]">{item.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.description}</p>
    </Link>
  )
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="hero-stage premium-portal-stage px-4 py-20 text-white sm:px-6 sm:py-28 lg:py-32">
        <HeroPortal />
        <div className="hero-content mx-auto max-w-6xl text-center">
          <div className="hero-kicker inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,.12)]">
            <Sparkles className="size-4" /> Plataforma empresarial
          </div>
          <h1 className="mx-auto mt-7 max-w-5xl text-balance text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl">
            <span className="hero-main-text">Credi Marketplace</span>
            <span className="hero-highlight"> conecta negocios</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg font-medium leading-8 text-slate-100 drop-shadow-[0_2px_12px_rgba(0,0,0,.8)] sm:text-xl">
            Un portal digital para descubrir, vender, comprar, negociar y construir relaciones comerciales en un mismo ecosistema.
          </p>
          <div className="hero-actions mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/explorar" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-7 py-3.5 text-sm font-black shadow-[0_10px_38px_rgba(37,99,235,.28)] hover:bg-brand-500">
              Explorar Marketplace <ArrowRight className="size-5" />
            </Link>
            <Link href="/vender" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/8 px-7 py-3.5 text-sm font-black backdrop-blur-sm hover:bg-white/12">
              Vender en Credi <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="premium-portal-strip border-y border-[var(--border)] bg-[var(--surface)] py-12 sm:py-16">
        <div className="container-marketplace">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-black text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              Ecosistema Credi
            </span>
            <h2 className="mt-4 text-2xl font-black text-[var(--foreground)] sm:text-4xl">Todo lo esencial, sin saturar el portal</h2>
            <p className="mt-4 leading-7 text-[var(--muted)]">Las funciones completas viven en el menú principal. Aquí solo dejamos accesos rápidos a las áreas más importantes.</p>
          </div>
          <div className="mx-auto mt-8 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((item) => <Highlight key={item.title} item={item} />)}
          </div>
        </div>
      </section>

      <section className="premium-portal-footer px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
        <div className="container-marketplace rounded-[2rem] border border-white/10 bg-neutral-950 px-6 py-10 text-center text-white shadow-2xl sm:px-12 sm:py-12">
          <div className="mx-auto flex max-w-4xl flex-col items-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
              <LockKeyhole className="size-5 text-cyan-200" />
            </div>
            <h2 className="text-2xl font-black sm:text-4xl">Confianza, comercio y conexión</h2>
            <p className="mt-4 max-w-2xl leading-7 text-neutral-300">Inicia sesión para acceder a tu espacio de trabajo, tus operaciones y todas las herramientas de Credi Marketplace.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-7 py-3.5 text-sm font-black hover:bg-brand-500">Crear cuenta</Link>
              <Link href="/chat" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-black hover:bg-white/10"><MessageCircle className="size-4" /> Credi Chat</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
