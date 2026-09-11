import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Inventario | Credi Marketplace',
  description: 'Centro operativo privado para controlar existencias, capacidad comercial y publicaciones de tu negocio.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login?next=%2Finventario')

  const { data: store } = await supabase
    .from('stores')
    .select('id,store_name,is_verified,is_active')
    .eq('vendor_id', auth.user.id)
    .maybeSingle()

  const products = store?.id
    ? (await supabase
        .from('products')
        .select('id,title,price,stock,is_active,images,video_media,created_at')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(250)).data ?? []
    : []

  const inventoryIds = products.map((product) => product.id)
  const inventoryRows = inventoryIds.length
    ? (await supabase.from('inventory').select('product_id,available_quantity,reserved_quantity,updated_at').in('product_id', inventoryIds)).data ?? []
    : []
  const inventoryMap = new Map(inventoryRows.map((row) => [row.product_id, row]))

  const totalUnits = products.reduce((sum, product) => sum + Math.max(0, Number(inventoryMap.get(product.id)?.available_quantity ?? product.stock ?? 0)), 0)
  const reservedUnits = products.reduce((sum, product) => sum + Math.max(0, Number(inventoryMap.get(product.id)?.reserved_quantity ?? 0)), 0)
  const active = products.filter((product) => product.is_active).length
  const low = products.filter((product) => Number(inventoryMap.get(product.id)?.available_quantity ?? product.stock ?? 0) > 0 && Number(inventoryMap.get(product.id)?.available_quantity ?? product.stock ?? 0) <= 5).length

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <header className="marketplace-card overflow-hidden rounded-[2rem] p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-[var(--primary)]">Credi Inventory OS</span>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-[var(--foreground)] sm:text-6xl">Inventario privado de {store?.store_name ?? 'mi negocio'}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base">Controla existencias, capacidad, reservas y estado comercial desde un único centro. Tu inventario permanece privado hasta que actives los canales de publicación.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/products/create" className="rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white shadow-lg hover:-translate-y-0.5">Nueva oferta</Link>
              <Link href="/gestion-empresarial" className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] px-5 py-3 text-sm font-black text-[var(--foreground)]">Gestión empresarial</Link>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Ofertas" value={products.length} />
          <Metric label="Activas" value={active} />
          <Metric label="Unidades disponibles" value={totalUnits} />
          <Metric label="Reservadas / bajo stock" value={`${reservedUnits} / ${low}`} />
        </section>

        <section className="mt-6 marketplace-card overflow-hidden rounded-[2rem]">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7">
            <div>
              <p className="text-xs font-black uppercase tracking-[.18em] text-[var(--primary)]">Control operativo</p>
              <h2 className="mt-1 text-2xl font-black">Existencias y ofertas</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">Cada registro aquí comienza privado; la publicación se activa por canal.</p>
            </div>
            {!store ? <Link href="/gestion-empresarial" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-black">Configurar negocio</Link> : null}
          </div>

          {products.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-[var(--surface-secondary)]">
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Oferta</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Precio</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Disponible</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Reservado</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Estado</th>
                    <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {products.map((product) => {
                    const row = inventoryMap.get(product.id)
                    const available = Number(row?.available_quantity ?? product.stock ?? 0)
                    const reserved = Number(row?.reserved_quantity ?? 0)
                    const stockState = available <= 0 ? 'Agotado' : available <= 5 ? 'Stock bajo' : 'Disponible'
                    return (
                      <tr key={product.id} className="hover:bg-[var(--surface-secondary)]/70">
                        <td className="px-5 py-4">
                          <p className="max-w-[360px] truncate font-black">{product.title}</p>
                          <p className="mt-1 font-mono text-[10px] text-[var(--muted)]">{product.id.slice(0, 12)}…</p>
                        </td>
                        <td className="px-5 py-4 font-black">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(product.price))}</td>
                        <td className="px-5 py-4 font-black">{available}</td>
                        <td className="px-5 py-4 font-semibold">{reserved}</td>
                        <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${stockState === 'Disponible' ? 'bg-emerald-500/10 text-emerald-700' : stockState === 'Stock bajo' ? 'bg-amber-500/10 text-amber-700' : 'bg-rose-500/10 text-rose-700'}`}>{stockState}</span></td>
                        <td className="px-5 py-4 text-right"><Link href="/gestion-empresarial" className="font-black text-[var(--primary)] hover:underline">Gestionar</Link></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center sm:p-16">
              <h3 className="text-2xl font-black">Tu inventario está listo para comenzar</h3>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">Registra tu primera oferta desde Publisher Studio. El sistema la mantendrá privada hasta que tú decidas qué canales activar.</p>
              <Link href="/products/create" className="mt-6 inline-flex rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white shadow-lg">Abrir Publisher Studio</Link>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="marketplace-card rounded-3xl p-5">
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-black text-[var(--foreground)]">{value}</p>
    </article>
  )
}
