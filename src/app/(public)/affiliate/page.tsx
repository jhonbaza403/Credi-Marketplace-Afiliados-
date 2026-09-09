import Link from "next/link";

export const metadata = {
  title: "Afiliados | Credi Marketplace",
  robots: { index: true, follow: true },
};

export default function AffiliatePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">Afiliados</p>
        <h1 className="mt-2 text-3xl font-bold text-neutral-950">Programa de afiliados</h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          Comparte productos, crea enlaces de referencia y consulta tus resultados desde tu área de afiliados.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/register" className="rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700">
            Crear cuenta
          </Link>
          <Link href="/dashboard/affiliate" className="rounded-xl border border-neutral-300 px-5 py-3 font-semibold text-neutral-800 hover:bg-neutral-50">
            Ir al área de afiliados
          </Link>
          <Link href="/marketplace" className="rounded-xl border border-neutral-300 px-5 py-3 font-semibold text-neutral-800 hover:bg-neutral-50">
            Ver marketplace
          </Link>
        </div>
      </div>
    </main>
  );
}
