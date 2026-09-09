import Link from "next/link";

export const metadata = {
  title: "Mis pedidos | Credi Marketplace",
  robots: { index: false, follow: true },
};

export default function OrdersPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">Pedidos</p>
        <h1 className="mt-2 text-3xl font-bold text-neutral-950">Mis pedidos</h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          Consulta tus compras desde tu cuenta. El acceso y los datos se validan en el servidor.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/login" className="rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700">
            Iniciar sesión
          </Link>
          <Link href="/dashboard" className="rounded-xl border border-neutral-300 px-5 py-3 font-semibold text-neutral-800 hover:bg-neutral-50">
            Ir al panel
          </Link>
          <Link href="/marketplace" className="rounded-xl border border-neutral-300 px-5 py-3 font-semibold text-neutral-800 hover:bg-neutral-50">
            Seguir comprando
          </Link>
        </div>
      </div>
    </main>
  );
}
