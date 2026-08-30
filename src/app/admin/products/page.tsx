import Link from 'next/link'

export default function Page() {
  return (
    <main className="mx-auto min-h-[60vh] w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-12">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Credi Marketplace</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Productos</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">Área administrativa para catálogo y moderación.</p>
        <Link href="/dashboard" className="mt-8 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Volver al dashboard</Link>
      </section>
    </main>
  )
}
