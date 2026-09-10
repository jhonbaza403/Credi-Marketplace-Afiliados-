import type { Metadata } from 'next'
import Link from 'next/link'
import CrediContactDirectory from '@/components/chat/CrediContactDirectory'

export const metadata: Metadata = {
  title: 'Red Comercial | Credi Marketplace',
  description: 'Conecta compradores, proveedores, empresas, vendedores y afiliados dentro de Credi Marketplace.',
}

const channels = [
  { title: 'Credi Chat', text: 'Mensajería directa, multimedia, voz y Credi LIVE.', href: '/chat', action: 'Abrir Credi Chat' },
  { title: 'Compras mayoristas', text: 'Abastecimiento B2B y negociación comercial.', href: '/compras-mayoristas', action: 'Explorar B2B' },
  { title: 'Proveedores verificados', text: 'Directorio de empresas verificadas y activas.', href: '/proveedores-verificados', action: 'Ver proveedores' },
  { title: 'Gestión empresarial', text: 'Inventario, catálogos, publicación y operaciones.', href: '/gestion-empresarial', action: 'Abrir centro empresarial' },
]

export default function CommercialNetworkPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="overflow-hidden rounded-[2rem] border border-border bg-card p-7 shadow-sm sm:p-10">
          <p className="text-xs font-black uppercase tracking-[.18em] text-primary">Credi Network</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-5xl">Red Comercial</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">Un punto de entrada único para conectar compradores, proveedores, empresas, vendedores y afiliados sin sacar la operación de Credi Marketplace.</p>
        </header>
        <CrediContactDirectory />
        <section className="grid gap-4 md:grid-cols-2">
          {channels.map((channel) => (
            <article key={channel.href} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-xl font-black text-foreground">{channel.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{channel.text}</p>
              <Link href={channel.href} className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground hover:opacity-90">{channel.action}</Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
