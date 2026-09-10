import Link from 'next/link'
import { ArrowRight, BarChart3, Building2, Settings2 } from 'lucide-react'

export const metadata = {
  title: 'Gestión empresarial | Credi Marketplace',
  description: 'Accede a las herramientas comerciales de Credi Marketplace para administrar tu actividad empresarial.',
}

export default function BusinessManagementPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="bg-neutral-950 px-4 py-20 text-white sm:px-6 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/20 bg-brand-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-200">
            <Building2 className="size-4" aria-hidden="true" /> Gestión empresarial
          </div>
          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">Organiza tu actividad comercial desde Credi.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-300">Centraliza presencia comercial, ventas, operaciones, afiliación y relaciones con proveedores en un ecosistema preparado para crecer.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-black text-white hover:bg-brand-500">Abrir gestión <ArrowRight className="size-4" aria-hidden="true" /></Link>
            <Link href="/b2b" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-black text-white hover:bg-white/10">Ver B2B</Link>
          </div>
        </div>
      </section>
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
          <article className="marketplace-card p-6"><BarChart3 className="size-6 text-brand-600" aria-hidden="true" /><h2 className="mt-4 text-xl font-black">Operaciones</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Consulta y gestiona la actividad de tu cuenta y tus operaciones comerciales.</p></article>
          <article className="marketplace-card p-6"><Settings2 className="size-6 text-indigo-600" aria-hidden="true" /><h2 className="mt-4 text-xl font-black">Configuración</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Administra perfil, preferencias y elementos operativos desde tu área privada.</p></article>
          <article className="marketplace-card p-6"><Building2 className="size-6 text-cyan-600" aria-hidden="true" /><h2 className="mt-4 text-xl font-black">Relaciones B2B</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Conecta con empresas y proveedores para desarrollar operaciones mayoristas.</p></article>
        </div>
      </section>
    </main>
  )
}
