import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ order_id?: string; session_id?: string }> }) {
  const params = await searchParams
  const orderId = params.order_id?.trim()
  const sessionId = params.session_id?.trim()
  return <main className="min-h-screen px-4 py-16 sm:px-6"><div className="mx-auto max-w-2xl rounded-3xl border border-emerald-300/20 bg-[var(--surface)] p-8 text-center shadow-2xl sm:p-10"><div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-3xl">✓</div><p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-emerald-700 dark:text-emerald-300">Stripe Checkout</p><h1 className="mt-2 text-3xl font-black">Pago enviado correctamente</h1><p className="mt-4 text-sm leading-6 text-[var(--muted)]">Stripe devolvió el checkout correctamente. La orden solo se considera pagada cuando Credi Marketplace verifica el webhook de Stripe y actualiza el estado en Supabase.</p>{orderId && <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4 text-left"><p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Orden</p><code className="mt-2 block break-all text-xs">{orderId}</code>{sessionId && <><p className="mt-4 text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Sesión Stripe</p><code className="mt-2 block break-all text-xs">{sessionId}</code></>}</div>}<div className="mt-7 flex flex-wrap justify-center gap-3"><Link href="/orders" className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white">Ver pedidos</Link><Link href="/marketplace" className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-black">Volver al Marketplace</Link></div></div></main>
}
