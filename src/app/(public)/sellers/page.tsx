import type { Metadata } from 'next'
import Link from 'next/link'
import { getDatabaseServerClient } from '@/lib/database/server'

export const metadata: Metadata = {
  title: 'Vendedores y proveedores verificados | Credi Marketplace',
  description: 'Directorio de vendedores y proveedores que superaron la verificación de identidad y empresa de Credi Marketplace.',
}

export default async function SellersPage() {
  const supabase = await getDatabaseServerClient()
  const { data, error } = await supabase
    .from('verified_businesses')
    .select('id,store_name,slug,vendor_id,is_verified,description,logo_url')
    .order('store_name', { ascending: true })
    .limit(60)

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="overflow-hidden rounded-[2rem] border border-border bg-card p-7 shadow-sm sm:p-10">
          <p className="text-xs font-black uppercase tracking-[.18em] text-primary">Credi Trust Network</p>
          <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-5xl">Vendedores y proveedores verificados</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">Credi no muestra una cuenta como vendedor verificado por un simple registro: el directorio exige identidad KYC, empresa KYB y tienda activa verificada.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/chat" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground">Credi Chat</Link>
              <Link href="/compras-mayoristas" className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted">Compras mayoristas</Link>
            </div>
          </div>
        </header>
        {error ? <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-muted-foreground">No fue posible cargar el directorio ahora.</div> : data?.length ? (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((store) => (
              <article key={store.id} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">KYC + KYB verificados</p><h2 className="mt-1 text-xl font-black text-foreground">{store.store_name}</h2></div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-700">VERIFICADO</span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{store.description || 'Empresa verificada en Credi Marketplace.'}</p>
                <div className="mt-5 flex gap-2"><Link href={`/chat?to=${encodeURIComponent(store.vendor_id)}`} className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-black text-primary-foreground">Contactar</Link><Link href={`/sellers/${encodeURIComponent(store.slug)}`} className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground">Empresa</Link></div>
              </article>
            ))}
          </section>
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
            <h2 className="text-xl font-black text-foreground">No hay vendedores con verificación completa visibles</h2>
            <p className="mt-2 text-sm text-muted-foreground">Esto es intencional: una cuenta nueva debe superar los controles antes de aparecer como vendedor confiable.</p>
            <Link href="/proveedores-verificados" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground">Ver proveedores verificados</Link>
          </div>
        )}
      </div>
    </main>
  )
}
