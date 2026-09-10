import Link from 'next/link'
import { ArrowRight, MessageCircle, ShieldCheck } from 'lucide-react'

export const metadata = {
  title: 'Contacto | Credi Marketplace',
  description: 'Canales de contacto y comunicación comercial de Credi Marketplace.',
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="bg-neutral-950 px-4 py-20 text-white sm:px-6 sm:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/20 bg-brand-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-200">
            <MessageCircle className="size-4" aria-hidden="true" /> Contacto comercial
          </div>
          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">Conecta con Credi Marketplace.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-300">Para consultas comerciales, relaciones empresariales y soporte de la plataforma, utiliza los canales internos disponibles.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/chat" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-black text-white hover:bg-brand-500">Abrir Credi Chat <ArrowRight className="size-4" aria-hidden="true" /></Link>
            <Link href="/security" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-black text-white hover:bg-white/10"><ShieldCheck className="size-4" aria-hidden="true" /> Seguridad</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
