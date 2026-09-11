import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Building2, Globe2, MessageCircle, Network, ShoppingBag, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Mercados conectados | Credi Marketplace',
  description: 'Descubre ofertas, proveedores y oportunidades comerciales entre mercados B2C y B2B.',
}

const markets = [
  { name: 'Marketplace B2C', region: 'Global', description: 'Productos y servicios para consumidores y compradores digitales.', href: '/marketplace', icon: ShoppingBag },
  { name: 'Mercado B2B', region: 'Global', description: 'Ofertas mayoristas, proveedores verificados y abastecimiento empresarial.', href: '/compras-mayoristas', icon: Building2 },
  { name: 'Explorar', region: 'Multirregional', description: 'Descubre categorías, oportunidades y conexiones dentro del ecosistema Credi.', href: '/explorar', icon: Network },
  { name: 'Ofertas', region: 'Multirregional', description: 'Accede a oportunidades comerciales y promociones disponibles.', href: '/ofertas', icon: Sparkles },
]

const regions = ['Norteamérica', 'Latinoamérica', 'Europa', 'Asia-Pacífico', 'África', 'Medio Oriente']

export default function ConnectedMarketsPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-20 sm:px-6 sm:py-28">
        <div className="container-marketplace mx-auto max-w-6xl">
          <div className="max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-black uppercase tracking-[.16em] text-brand-700 dark:bg-brand-950 dark:text-brand-300"><Globe2 className="size-4" /> Credi Global Commerce</span>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-[var(--foreground)] sm:text-6xl">Mercados conectados</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--muted)]">Encuentra ofertas y relaciones comerciales desde distintos mercados y regiones. Una sola experiencia para descubrir, comparar, contactar y continuar una oportunidad.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/explorar" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-black text-white hover:bg-brand-500">Explorar oportunidades <ArrowRight className="size-4" /></Link>
              <Link href="/chat" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-6 py-3.5 text-sm font-black text-[var(--foreground)]"><MessageCircle className="size-4" /> Hablar con un contacto</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--background)] px-4 py-16 sm:px-6 sm:py-24">
        <div className="container-marketplace mx-auto max-w-6xl">
          <div className="max-w-3xl"><h2 className="text-3xl font-black text-[var(--foreground)] sm:text-4xl">Fuentes comerciales conectadas</h2><p className="mt-4 leading-7 text-[var(--muted)]">Credi separa la experiencia de descubrimiento por capacidad comercial, pero mantiene una estrategia integrada para B2C, B2B, servicios y oportunidades.</p></div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {markets.map(({ name, region, description, href, icon: Icon }) => (
              <Link key={name} href={href} className="marketplace-card group rounded-2xl p-6 transition hover:-translate-y-1">
                <div className="flex items-start justify-between gap-4"><span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"><Icon className="size-6" /></span><span className="rounded-full bg-[var(--surface-secondary)] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">{region}</span></div>
                <h3 className="mt-6 text-xl font-black text-[var(--foreground)]">{name}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-xs font-black text-brand-600 dark:text-brand-400">Abrir mercado <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--surface)] px-4 py-16 sm:px-6 sm:py-20">
        <div className="container-marketplace mx-auto max-w-6xl"><div className="max-w-3xl"><h2 className="text-3xl font-black text-[var(--foreground)] sm:text-4xl">Visión global por región</h2><p className="mt-4 leading-7 text-[var(--muted)]">Las regiones funcionan como una capa de descubrimiento; la disponibilidad concreta depende de las ofertas publicadas y de los controles comerciales de Credi.</p></div><div className="mt-8 flex flex-wrap gap-3">{regions.map((region) => <span key={region} className="rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-2.5 text-sm font-bold text-[var(--foreground)]">{region}</span>)}</div></div>
      </section>
    </main>
  )
}
