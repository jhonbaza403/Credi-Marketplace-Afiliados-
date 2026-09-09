import Link from "next/link";

export const metadata = {
  title: "Mi cuenta | Credi Marketplace",
  robots: { index: false, follow: true },
};

export default function AccountPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">Cuenta</p>
        <h1 className="mt-2 text-3xl font-bold text-neutral-950">Mi cuenta</h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          Administra tu perfil, pedidos, afiliación y preferencias desde el panel de Credi Marketplace.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/login" className="rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700">
            Iniciar sesión
          </Link>
          <Link href="/dashboard" className="rounded-xl border border-neutral-300 px-5 py-3 font-semibold text-neutral-800 hover:bg-neutral-50">
            Ir al panel
          </Link>
          <Link href="/dashboard/affiliate" className="rounded-xl border border-neutral-300 px-5 py-3 font-semibold text-neutral-800 hover:bg-neutral-50">
            Área de afiliados
          </Link>
        </div>
      </div>
    </main>
  );
}
