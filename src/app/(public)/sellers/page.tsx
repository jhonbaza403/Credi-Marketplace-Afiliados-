import type { Metadata } from 'next'
import Link from 'next/link'
import { getDatabaseServerClient } from '@/lib/database/server'

export const metadata: Metadata = {
  title: 'Proveedores verificados | Credi Marketplace',
  description: 'Directorio activo de vendedores y proveedores verificados de Credi Marketplace.',
}

export default async function SellersPage() {
  const supabase = await getDatabaseServerClient()
  const { data, error } = await supabase
    .from('stores')
    .select('id,store_name,slug,vendor_id,is_verified,is_active,description')
    .eq('is_active', true)
    .order('is_verified', { ascending: false })
    .order('store_name', { ascending: true })
    .limit(60)

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="overflow-hidden rounded-[2rem] border border-border bg-card p-7 shadow-sm sm:p-10">
          <p className="text-xs font-black uppercase tracking-[.18em] text-primary">Credi Seller Network</p>
          <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-5xl">Vendedores y proveedores</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">Consulta empresas activas, identifica cuentas verificadas y abre Credi Chat directamente desde el directorio.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/proveedores-verificados" className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted">Solo verificados</Link>
              <Link href="/chat" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground">Credi Chat</Link>
            </div>
          </div>
        </header>
        {error ? <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-muted-foreground">No fue posible cargar el directorio ahora.</div> : data?.length ? (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((store) => (
              <article key={store.id} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {store.is_verified && <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Verificado</p>}
                    <h2 className="mt-1 text-xl font-black text-foreground">{store.store_name}</h2>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-black text-muted-foreground">ACTIVO</span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{store.description || 'Empresa activa en Credi Marketplace.'}</p>
                <div className="mt-5 flex gap-2">
                  <Link href={`/chat?to=${encodeURIComponent(store.vendor_id)}`} className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-black text-primary-foreground">Contactar</Link>
                  <Link href={`/sellers/${encodeURIComponent(store.slug)}`} className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted">Empresa</Link>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
            <h2 className="text-xl font-black text-foreground">Todavía no hay vendedores visibles</h2>
            <p className="mt-2 text-sm text-muted-foreground">Puedes comenzar una relación comercial desde Compras mayoristas.</p>
            <Link href="/compras-mayoristas" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground">Abrir compras mayoristas</Link>
          </div>
        )}
      </div>
    </main>
  )
}
