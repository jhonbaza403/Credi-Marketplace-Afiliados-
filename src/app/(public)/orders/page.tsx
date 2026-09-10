import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import TransactionRatingCard from "@/components/reputation/TransactionRatingCard";
import { getUserOrders } from "@/lib/database/queries";
import { getDatabaseServerClient } from "@/lib/database/server";

export const metadata: Metadata = {
  title: "Mis pedidos | Credi Marketplace",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function formatCurrency(value: unknown, currency: unknown) {
  const amount = Number(value ?? 0);
  const code = typeof currency === "string" && currency.length === 3 ? currency : "USD";

  try {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: code }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

function statusLabel(status: unknown) {
  const value = typeof status === "string" ? status : "pending";
  const labels: Record<string, string> = {
    pending: "Pendiente",
    paid: "Pagado",
    processing: "Procesando",
    shipped: "Enviado",
    delivered: "Entregado",
    completed: "Completado",
    cancelled: "Cancelado",
    refunded: "Reembolsado",
  };
  return labels[value] ?? value;
}

export default async function OrdersPage() {
  const supabase = await getDatabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) redirect("/login?next=%2Forders");

  try {
    const orders = await getUserOrders(user.id);

    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Pedidos</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Mis pedidos</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">Consulta el estado, importe y productos de tus compras desde una sola sección.</p>
        </header>

        {orders.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-border bg-card p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-xl">📦</div>
            <h2 className="mt-5 text-xl font-black text-foreground">Todavía no tienes pedidos</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Cuando completes una compra, aparecerá aquí automáticamente.</p>
            <Link href="/marketplace" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90">Ir al Marketplace</Link>
          </section>
        ) : (
          <section className="space-y-4">
            {orders.map((order) => {
              const items = Array.isArray(order.order_items) ? order.order_items : [];
              const delivered = order.status === "delivered" || order.status === "completed";

              return (
                <article key={order.id} className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pedido</p>
                      <p className="mt-1 font-mono text-sm text-foreground">{order.id}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.created_at))}</p>
                    </div>
                    <div className="sm:text-right">
                      <span className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-bold text-foreground">{statusLabel(order.status)}</span>
                      <p className="mt-2 text-xl font-black text-foreground">{formatCurrency(order.total_amount, order.currency)}</p>
                    </div>
                  </div>

                  {items.length > 0 && (
                    <div className="mt-5 border-t border-border pt-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Productos</p>
                      <div className="mt-3 space-y-2">
                        {items.map((item: Record<string, unknown>, index: number) => (
                          <div key={typeof item.id === "string" ? item.id : `${order.id}-${index}`} className="flex items-center justify-between gap-4 rounded-xl bg-muted/40 px-4 py-3 text-sm">
                            <span className="min-w-0 truncate text-foreground">{typeof item.product_title === "string" ? item.product_title : typeof item.title === "string" ? item.title : `Producto ${index + 1}`}</span>
                            <span className="shrink-0 font-semibold text-muted-foreground">×{Number(item.quantity ?? 1)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {delivered && <TransactionRatingCard orderId={order.id} />}
                </article>
              );
            })}
          </section>
        )}
      </main>
    );
  } catch (error) {
    console.error("[OrdersPage] Failed to load orders", error);
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <section className="rounded-3xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-xl">⚠️</div>
          <h1 className="mt-5 text-2xl font-black text-foreground">No fue posible cargar tus pedidos</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">El servicio de pedidos no respondió correctamente. Puedes reintentarlo sin perder tu sesión.</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/orders" className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90">Reintentar</Link>
            <Link href="/marketplace" className="rounded-xl border border-border px-5 py-3 text-sm font-bold text-foreground hover:bg-muted">Marketplace</Link>
          </div>
        </section>
      </main>
    );
  }
}
