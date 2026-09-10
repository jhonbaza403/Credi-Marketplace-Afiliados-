import type { Metadata } from 'next'
import Link from 'next/link'
import B2BMarketplace from '@/components/seller/B2BMarketplace'

export const metadata: Metadata = {
  title: 'Compras mayoristas | Credi Marketplace',
  description: 'Centro B2B para compras mayoristas, abastecimiento y negociación empresarial en Credi Marketplace.',
  robots: { index: false, follow: false },
}

export default function WholesalePurchasingPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.18em] text-primary">Credi Wholesale</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-5xl">Compras mayoristas</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">Consulta inventario empresarial, añade productos al carrito B2B y continúa la negociación dentro de Credi Chat.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/proveedores-verificados" className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted">Proveedores verificados</Link>
              <Link href="/chat" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">Negociar en Credi Chat</Link>
            </div>
          </div>
        </header>
        <B2BMarketplace />
      </div>
    </main>
  )
}
