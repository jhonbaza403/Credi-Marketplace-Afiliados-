import Link from 'next/link'
import { ArrowRight, Globe2, MapPinned, Languages } from 'lucide-react'

export const metadata = {
  title: 'Alcance internacional | Credi Marketplace',
  description: 'Explora el ecosistema internacional de Credi Marketplace para conectar compradores, vendedores, proveedores y empresas.',
}

export default function InternationalPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="bg-neutral-950 px-4 py-20 text-white sm:px-6 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-200">
            <Globe2 className="size-4" aria-hidden="true" />
            Alcance internacional
          </div>
          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">Comercio que conecta mercados más allá de las fronteras.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-300">
            Descubre productos, proveedores, servicios y oportunidades comerciales dentro de un ecosistema preparado para operar entre regiones y países.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/explorar" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-black text-white hover:bg-brand-500">
              Explorar mercado <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href="/b2b" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-black text-white hover:bg-white/10">
              Explorar B2B
            </Link>
          </div>
        </div>
      </section>
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
          <article className="marketplace-card p-6"><MapPinned className="size-6 text-brand-600" aria-hidden="true" /><h2 className="mt-4 text-xl font-black">Mercados conectados</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Encuentra ofertas y relaciones comerciales desde distintos mercados y regiones.</p></article>
          <article className="marketplace-card p-6"><Languages className="size-6 text-cyan-600" aria-hidden="true" /><h2 className="mt-4 text-xl font-black">Comunicación comercial</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Conecta con vendedores y proveedores mediante Credi Business Chat.</p></article>
          <article className="marketplace-card p-6"><Globe2 className="size-6 text-indigo-600" aria-hidden="true" /><h2 className="mt-4 text-xl font-black">Visión global</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Desarrolla oportunidades B2C y B2B sin limitar tu estrategia comercial a un solo mercado.</p></article>
        </div>
      </section>
    </main>
  )
}
