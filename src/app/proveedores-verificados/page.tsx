import type { Metadata } from 'next'
import Link from 'next/link'
import { getDatabaseServerClient } from '@/lib/database/server'

export const metadata: Metadata = {
  title: 'Proveedores verificados | Credi Marketplace',
  description: 'Directorio de empresas y proveedores verificados de Credi Marketplace.',
}

export default async function VerifiedSuppliersPage() {
  const supabase = await getDatabaseServerClient()
  const { data: stores, error } = await supabase
    .from('stores')
    .select('id,store_name,slug,vendor_id,is_verified,is_active,description')
    .eq('is_active', true)
    .eq('is_verified', true)
    .order('store_name', { ascending: true })
    .limit(60)

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="overflow-hidden rounded-[2rem] border border-border bg-card p-7 shadow-sm sm:p-10">
          <p className="text-xs font-black uppercase tracking-[.18em] text-primary">Credi Trust Network</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-5xl">Proveedores verificados</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">Encuentra empresas activas con verificación comercial y abre una conversación directa para disponibilidad, precios, MOQ, logística y condiciones.</p>
        </header>
        {error ? <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-muted-foreground">No fue posible cargar el directorio ahora.</div> : stores?.length ? (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <article key={store.id} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-emerald-600">Verificado</p>
                    <h2 className="mt-2 text-xl font-black text-foreground">{store.store_name}</h2>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-700">ACTIVO</span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{store.description || 'Proveedor activo en Credi Marketplace.'}</p>
                <div className="mt-5 flex gap-2">
                  <Link href={`/chat?to=${encodeURIComponent(store.vendor_id)}`} className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-black text-primary-foreground hover:opacity-90">Contactar</Link>
                  <Link href={`/sellers/${encodeURIComponent(store.slug)}`} className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted">Ver empresa</Link>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
            <h2 className="text-xl font-black text-foreground">Aún no hay proveedores verificados visibles</h2>
            <p className="mt-2 text-sm text-muted-foreground">Mientras crece la red, puedes explorar el B2B y abrir conversaciones comerciales desde los productos.</p>
            <Link href="/compras-mayoristas" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground">Ir a compras mayoristas</Link>
          </div>
        )}
      </div>
    </main>
  )
}
