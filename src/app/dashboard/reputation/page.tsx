import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import TransactionRatingCard from '@/components/reputation/TransactionRatingCard'
import { getDatabaseServerClient } from '@/lib/database/server'

export const metadata: Metadata = {
  title: 'Reputación comercial | Credi Marketplace',
  description: 'Califica clientes y consulta la reputación transaccional de tu operación comercial en Credi Marketplace.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function SellerReputationPage() {
  const supabase = await getDatabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=%2Fdashboard%2Freputation')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const isSeller = profile?.role === 'vendor' || profile?.role === 'company' || profile?.role === 'professional' || profile?.role === 'admin'

  if (!isSeller) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <section className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <p className="text-xs font-black uppercase tracking-[.16em] text-primary">Credi Reputation</p>
          <h1 className="mt-3 text-3xl font-black text-foreground">Reputación comercial</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Esta sección se habilita para perfiles con actividad comercial.</p>
          <Link href="/marketplace" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Ir al Marketplace</Link>
        </section>
      </main>
    )
  }

  const { data: sales, error } = await supabase
    .from('orders')
    .select('id,status,created_at,order_items!inner(store_id,product_id,product_title,stores!inner(vendor_id))')
    .eq('status', 'delivered')
    .eq('order_items.stores.vendor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const orderIds = [...new Set((sales ?? []).map((sale) => sale.id))]

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <header className="mb-8 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-xs font-black uppercase tracking-[.16em] text-primary">Credi Reputation</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Reputación de tus clientes</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Después de una entrega, puedes valorar al cliente real asociado a esa operación. La plataforma registra una sola evaluación por parte y por tienda, evitando calificaciones sin transacción.</p>
      </header>

      {error ? (
        <section className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-muted-foreground">No fue posible cargar tus ventas entregadas.</section>
      ) : orderIds.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-border bg-card p-10 text-center shadow-sm">
          <h2 className="text-xl font-black text-foreground">Todavía no hay ventas entregadas</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Cuando completes una venta, aparecerá aquí la opción de valorar al cliente.</p>
          <Link href="/dashboard/seller" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Volver al panel comercial</Link>
        </section>
      ) : (
        <section className="space-y-5">
          {orderIds.map((orderId) => (
            <article key={orderId} className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Venta entregada</p>
                <p className="mt-1 font-mono text-xs text-foreground">{orderId}</p>
              </div>
              <TransactionRatingCard orderId={orderId} />
            </article>
          ))}
        </section>
      )}
    </main>
  )
}
