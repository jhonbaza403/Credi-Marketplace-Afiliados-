import Link from 'next/link'
import { ArrowRight, Building2, ShoppingBag, Store } from 'lucide-react'

export const metadata = {
  title: 'B2B y B2C | Credi Marketplace',
  description: 'Conoce los modelos B2C y B2B de Credi Marketplace para compras, ventas y relaciones comerciales.',
}

export default function CommerceModelsPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="bg-neutral-950 px-4 py-20 text-white sm:px-6 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-200">
            <Store className="size-4" aria-hidden="true" />
            B2B y B2C
          </div>
          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">Dos modelos comerciales, un mismo ecosistema.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-300">Compra como consumidor, vende al mercado o desarrolla relaciones entre empresas con herramientas conectadas.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/marketplace" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-black text-white hover:bg-brand-500">Modelo B2C <ArrowRight className="size-4" aria-hidden="true" /></Link>
            <Link href="/b2b" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-black text-white hover:bg-white/10">Empresas B2B</Link>
          </div>
        </div>
      </section>
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
          <article className="marketplace-card p-7"><ShoppingBag className="size-7 text-brand-600" aria-hidden="true" /><h2 className="mt-4 text-2xl font-black">Modelo B2C</h2><p className="mt-2 text-sm leading-7 text-[var(--muted)]">Descubre productos, compra directamente y gestiona tus pedidos dentro del marketplace.</p><Link href="/marketplace" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-600">Ir al marketplace <ArrowRight className="size-4" aria-hidden="true" /></Link></article>
          <article className="marketplace-card p-7"><Building2 className="size-7 text-indigo-600" aria-hidden="true" /><h2 className="mt-4 text-2xl font-black">Empresas B2B</h2><p className="mt-2 text-sm leading-7 text-[var(--muted)]">Encuentra ofertas mayoristas, proveedores y oportunidades de abastecimiento empresarial.</p><Link href="/b2b" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-indigo-600">Ir al portal B2B <ArrowRight className="size-4" aria-hidden="true" /></Link></article>
        </div>
      </section>
    </main>
  )
}
