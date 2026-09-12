import Link from 'next/link'

const modules = [
  ['Credi-Crédito AI', 'Scoring auditable, bandas de riesgo y límites sugeridos.', '/api/ai/credit'],
  ['Credi-Dropshipping AI', 'Enriquecimiento de catálogo y contenido comercial.', '/api/ai/dropshipping'],
  ['Credi-Flex AI', 'Optimización de rutas y consolidación logística.', '/api/logistics/optimize'],
  ['Smart Lockers', 'Estados de casillero y retiro seguro.', '/api/logistics/optimize'],
  ['Credi-Escrow', 'Custodia, ventana de disputa y liberación determinística.', '/api/escrow/release'],
  ['Credi-Live', 'Sesiones, productos y eventos de Live Shopping.', '/api/live/sessions'],
  ['Credi Reputation', 'Reputación transversal basada en eventos verificables.', '/api/reputation'],
]

export default function AutonomousCommercePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Credi Marketplace</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">Autonomous Commerce Control Center</h1>
            <p className="mt-3 max-w-3xl text-slate-300">
              Capa de inteligencia para crédito, catálogo, logística, escrow, live commerce y reputación.
              Los modelos producen recomendaciones auditables; las operaciones financieras críticas permanecen gobernadas por reglas determinísticas.
            </p>
          </div>
          <Link href="/business-os" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-900">Business OS</Link>
        </div>

        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {modules.map(([name, description, endpoint]) => (
            <article key={name} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">AI / CORE</span>
                <span className="text-xs text-slate-500">READY</span>
              </div>
              <h2 className="text-xl font-semibold">{name}</h2>
              <p className="mt-2 min-h-16 text-sm leading-6 text-slate-400">{description}</p>
              <code className="mt-5 block rounded-lg bg-slate-950 px-3 py-2 text-xs text-slate-500">{endpoint}</code>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Principios de control</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div><p className="font-medium">Explicable</p><p className="mt-1 text-sm text-slate-400">Cada decisión de IA registra versión, hash, resultado y razones.</p></div>
            <div><p className="font-medium">Privado</p><p className="mt-1 text-sm text-slate-400">No se habilitan señales sensibles por defecto; el dato requiere finalidad y control de acceso.</p></div>
            <div><p className="font-medium">Auditable</p><p className="mt-1 text-sm text-slate-400">Pagos, escrow y cambios críticos mantienen trazabilidad de eventos.</p></div>
          </div>
        </section>
      </div>
    </main>
  )
}
