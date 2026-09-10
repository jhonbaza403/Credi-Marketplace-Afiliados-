import Link from 'next/link'
import { ArrowRight, Handshake, Network, Users } from 'lucide-react'

export const metadata = {
  title: 'Red comercial | Credi Marketplace',
  description: 'Conecta afiliados, partners, vendedores y oportunidades comerciales dentro de la red de Credi Marketplace.',
}

export default function CommercialNetworkPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="bg-neutral-950 px-4 py-20 text-white sm:px-6 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/20 bg-brand-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-200">
            <Network className="size-4" aria-hidden="true" /> Red comercial
          </div>
          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">Una red para conectar personas y oportunidades de negocio.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-300">Integra afiliados, partners, vendedores y compradores en un entorno diseñado para generar relaciones comerciales.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/affiliate" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-black text-white hover:bg-brand-500">Programa de afiliados <ArrowRight className="size-4" aria-hidden="true" /></Link>
            <Link href="/partners" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-black text-white hover:bg-white/10">Partners</Link>
          </div>
        </div>
      </section>
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
          <article className="marketplace-card p-6"><Users className="size-6 text-brand-600" aria-hidden="true" /><h2 className="mt-4 text-xl font-black">Afiliados</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Participa en un modelo de recomendación y comercialización conectado al marketplace.</p></article>
          <article className="marketplace-card p-6"><Handshake className="size-6 text-indigo-600" aria-hidden="true" /><h2 className="mt-4 text-xl font-black">Partners</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Desarrolla alianzas y nuevas oportunidades dentro del ecosistema empresarial.</p></article>
          <article className="marketplace-card p-6"><Network className="size-6 text-cyan-600" aria-hidden="true" /><h2 className="mt-4 text-xl font-black">Conexión comercial</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Conecta con otros participantes mediante las herramientas de comunicación de Credi.</p></article>
        </div>
      </section>
    </main>
  )
}
