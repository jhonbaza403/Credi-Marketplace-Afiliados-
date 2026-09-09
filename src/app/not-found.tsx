import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">Credi Marketplace</p>
      <h1 className="mt-3 text-3xl font-bold text-neutral-950">No encontramos esta página</h1>
      <p className="mt-3 max-w-xl text-neutral-600">
        Comprueba la dirección o continúa desde una sección válida de Credi Marketplace.
        Las páginas protegidas pueden solicitar inicio de sesión.
      </p>
      <nav aria-label="Navegación de recuperación" className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700">Inicio</Link>
        <Link href="/marketplace" className="rounded-xl border border-neutral-300 px-5 py-3 font-semibold text-neutral-800 hover:bg-neutral-50">Marketplace</Link>
        <Link href="/products" className="rounded-xl border border-neutral-300 px-5 py-3 font-semibold text-neutral-800 hover:bg-neutral-50">Productos</Link>
        <Link href="/services" className="rounded-xl border border-neutral-300 px-5 py-3 font-semibold text-neutral-800 hover:bg-neutral-50">Servicios</Link>
      </nav>
    </main>
  );
}
