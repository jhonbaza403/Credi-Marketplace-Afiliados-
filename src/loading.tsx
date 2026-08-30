export default function Loading() {
  return (
    <main className="flex min-h-[50vh] items-center justify-center" aria-busy="true">
      <div className="size-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      <span className="sr-only">Cargando…</span>
    </main>
  );
}
