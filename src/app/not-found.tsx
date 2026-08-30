import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">404</p>
      <h1 className="mt-3 text-3xl font-bold text-neutral-950">Página no encontrada</h1>
      <p className="mt-3 max-w-md text-neutral-600">La dirección solicitada no existe o ya no está disponible.</p>
      <Link href="/" className="mt-6 rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700">Volver al inicio</Link>
    </main>
  );
}
