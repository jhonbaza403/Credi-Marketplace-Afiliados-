import Link from 'next/link'
import { ArrowRight, BadgeCheck, Building2, BriefcaseBusiness, Globe2, Handshake, LockKeyhole, MessageCircle, Network, ShoppingBag, Sparkles, Store, Users } from 'lucide-react'
import HeroPortal from '@/components/layout/HeroPortal'
import '@/styles/hero-portal.css'

type Item = { title: string; description: string; href: string; icon: React.ReactNode }

const pillars: Item[] = [
  { title: 'Comercio seguro', description: 'Conoce la protección y seguridad de la plataforma.', href: '/security', icon: <LockKeyhole /> },
  { title: 'Alcance internacional', description: 'Conecta con mercados y oportunidades internacionales.', href: '/internacional', icon: <Globe2 /> },
  { title: 'B2B y B2C', description: 'Compra, vende y desarrolla relaciones comerciales.', href: '/comercio', icon: <Building2 /> },
]

const ecosystem: Item[] = [
  { title: 'Comunidad Global', description: 'Participa en la comunidad de Credi.', href: '/social', icon: <Users /> },
  { title: 'Modelo B2C', description: 'Explora productos y compra en el marketplace.', href: '/marketplace', icon: <ShoppingBag /> },
  { title: 'Empresas B2B', description: 'Accede al entorno mayorista empresarial.', href: '/b2b', icon: <Building2 /> },
  { title: 'Comercio Digital', description: 'Descubre el catálogo y las herramientas comerciales.', href: '/marketplace', icon: <Store /> },
]

const business: Item[] = [
  { title: 'Compras Mayoristas', description: 'Ofertas y oportunidades de abastecimiento B2B.', href: '/b2b', icon: <ShoppingBag /> },
  { title: 'Proveedores Verificados', description: 'Consulta vendedores y proveedores del ecosistema.', href: '/sellers', icon: <BadgeCheck /> },
  { title: 'Gestión Empresarial', description: 'Organiza tu actividad y relaciones comerciales.', href: '/gestion-empresarial', icon: <BriefcaseBusiness /> },
  { title: 'Red Comercial', description: 'Conecta afiliados, partners y oportunidades.', href: '/red-comercial', icon: <Network /> },
]

const connectedMarkets: Item[] = [
  { title: 'Mercados conectados', description: 'Encuentra ofertas, proveedores y relaciones comerciales desde distintos mercados y regiones.', href: '/explorar', icon: <Globe2 /> },
  { title: 'Comunicación comercial', description: 'Conecta con vendedores y proveedores mediante Credi Business Chat para consultar, negociar y cerrar oportunidades.', href: '/chat', icon: <MessageCircle /> },
  { title: 'Visión global', description: 'Desarrolla oportunidades B2C y B2B sin limitar tu estrategia comercial a un solo mercado.', href: '/comercio', icon: <Network /> },
]

function Card({ item }: { item: Item }) {
  return <Link href={item.href} className="group marketplace-card block rounded-2xl p-6 transition hover:-translate-y-1 hover:shadow-marketplace-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
    <span className="mb-5 flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">{item.icon}</span>
    <h3 className="text-lg font-black text-[var(--foreground)]">{item.title}</h3>
    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.description}</p>
    <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-400">Explorar <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" /></span>
  </Link>
}

export default function HomePage() {
  return <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
    <section className="hero-stage px-4 py-20 text-white sm:px-6 sm:py-28">
      <HeroPortal />
      <div className="hero-content mx-auto max-w-6xl text-center">
        <div className="hero-kicker inline-flex items-center gap-2 rounded-full border border-brand-400/25 bg-brand-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,.12)]"><Sparkles className="size-4" /> Plataforma comercial B2B &amp; B2C</div>
        <h1 className="mx-auto mt-7 max-w-5xl text-balance text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl">
          <span className="hero-main-text">El ecosistema digital para </span>
          <span className="hero-highlight">crecer sin límites</span>
        </h1>
        <p className="hero-description mx-auto mt-6 max-w-3xl text-lg font-medium leading-8 text-slate-100 drop-shadow-[0_2px_12px_rgba(0,0,0,.8)]">Compra, vende y desarrolla oportunidades comerciales conectando personas, profesionales, proveedores, vendedores y empresas.</p>
        <div className="hero-actions mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/explorar" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-7 py-3.5 text-sm font-black shadow-[0_10px_38px_rgba(37,99,235,.28)] hover:bg-brand-500">Explorar mercado <ArrowRight className="size-5" /></Link>
          <Link href="/vender" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/8 px-7 py-3.5 text-sm font-black backdrop-blur-sm hover:bg-white/12">Empieza a vender <ArrowRight className="size-4" /></Link>
        </div>
      </div>
    </section>

    <section className="border-b border-[var(--border)] bg-[var(--surface)] py-20 sm:py-24"><div className="container-marketplace"><div className="mx-auto max-w-3xl text-center"><span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-black text-brand-700 dark:bg-brand-950 dark:text-brand-300">Ecosistema conectado</span><h2 className="mt-5 text-3xl font-black text-[var(--foreground)] sm:text-4xl lg:text-5xl">Mercados conectados, comunicación comercial y visión global</h2><p className="mt-5 leading-7 text-[var(--muted)]">Una arquitectura comercial pensada para descubrir oportunidades, relacionarte con proveedores y operar entre B2C y B2B.</p></div><div className="mx-auto mt-10 grid max-w-6xl gap-5 md:grid-cols-3">{connectedMarkets.map((item) => <Card key={item.title} item={item} />)}</div></div></section>

    <section className="bg-[var(--background)] py-20 sm:py-28"><div className="container-marketplace"><div className="mx-auto max-w-3xl text-center"><h2 className="text-3xl font-black text-[var(--foreground)] sm:text-4xl lg:text-5xl">Comercio seguro, alcance internacional y B2B/B2C</h2><p className="mt-5 leading-7 text-[var(--muted)]">Estos conectores son enlaces reales hacia sus destinos funcionales.</p></div><div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-3">{pillars.map((item) => <Card key={item.title} item={item} />)}</div></div></section>

    <section className="border-y border-[var(--border)] bg-[var(--surface)] py-20"><div className="container-marketplace"><div className="mx-auto max-w-3xl text-center"><h2 className="text-3xl font-black text-[var(--foreground)] sm:text-4xl">Comunidad Global · Modelo B2C · Empresas B2B · Comercio Digital</h2><p className="mt-5 leading-7 text-[var(--muted)]">Cada indicador de la portada dirige a una sección concreta.</p></div><div className="mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">{ecosystem.map((item) => <Card key={item.title} item={item} />)}</div></div></section>

    <section className="bg-[var(--background)] py-20 sm:py-24"><div className="container-marketplace"><div className="mx-auto max-w-3xl text-center"><div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300"><Handshake className="size-4" /> Red empresarial</div><h2 className="mt-5 text-3xl font-black text-[var(--foreground)] sm:text-4xl">Compras Mayoristas · Proveedores Verificados · Gestión Empresarial · Red Comercial</h2></div><div className="mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">{business.map((item) => <Card key={item.title} item={item} />)}</div></div></section>

    <section className="px-4 pb-20 sm:px-6"><div className="container-marketplace rounded-[2rem] bg-neutral-950 px-6 py-16 text-center text-white shadow-2xl sm:px-12"><h2 className="text-3xl font-black sm:text-5xl">Una ruta clara para cada necesidad comercial</h2><p className="mx-auto mt-5 max-w-2xl leading-7 text-neutral-300">Inicia sesión, crea tu cuenta o comunícate con otros participantes mediante Credi Business Chat.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/register" className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-7 py-3.5 text-sm font-black hover:bg-brand-500">Crear cuenta</Link><Link href="/contacto" className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-black hover:bg-white/10">Contacto</Link><Link href="/chat" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-black hover:bg-white/10"><MessageCircle className="size-4" /> Credi Chat</Link></div></div></section>
  </main>
}
