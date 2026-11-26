'use client'

import { useState } from 'react'

type AutomationResultItem = {
  rule_id: string
  name: string
  action_type?: string
  status: string
  reason?: string
  details?: Record<string, unknown>
  rule_last_run_persisted?: boolean
}

type AutomationRunResult = {
  evaluated?: number
  triggered?: number
  executed?: number
  failed?: number
  results?: AutomationResultItem[]
}

export default function AutomationPage() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<AutomationRunResult | null>(null)

  async function runAutomation() {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/automation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const payload = await response.json().catch(() => ({}))
      if (response.status === 401) {
        window.location.assign(`/login?next=${encodeURIComponent('/automation')}`)
        return
      }
      if (!response.ok) throw new Error(payload.error || 'No fue posible ejecutar las reglas.')
      setResult(payload)
      setMessage(
        `Evaluadas: ${payload.evaluated ?? 0} · Disparadas: ${payload.triggered ?? 0} · Ejecutadas: ${payload.executed ?? 0} · Fallidas: ${payload.failed ?? 0}`,
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible ejecutar la automatización.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[2rem] border border-border bg-card p-7 shadow-sm sm:p-10">
          <p className="text-xs font-black uppercase tracking-[.22em] text-primary">CREDI-AUTOMATION</p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">Automatización gobernada</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
            Evalúa tus reglas activas. En esta fase solo se ejecuta la acción real <strong>notify_owner</strong>, que crea una notificación interna. Las acciones aún no conectadas se marcan como fallidas; no se simula su ejecución.
          </p>
          <button type="button" onClick={runAutomation} disabled={busy} className="mt-7 rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground disabled:opacity-50">
            {busy ? 'Ejecutando…' : 'Ejecutar reglas ahora'}
          </button>
          {message && <p role="status" className="mt-5 rounded-2xl border border-border bg-muted p-4 text-sm">{message}</p>}
        </section>
        {result?.results?.length ? (
          <section className="space-y-3">
            <h2 className="text-xl font-black">Detalle de ejecución</h2>
            {result.results.map((item) => (
              <article key={item.rule_id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-black">{item.name}</h3>
                  <span className="rounded-full border border-border px-3 py-1 text-xs font-bold">{item.status}</span>
                </div>
                {item.action_type && <p className="mt-1 text-sm text-muted-foreground">{item.action_type}</p>}
                {item.reason && <p className="mt-2 text-sm text-red-600">{item.reason}</p>}
                {item.details && <pre className="mt-3 overflow-auto rounded-xl bg-muted p-3 text-xs">{JSON.stringify(item.details, null, 2)}</pre>}
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </main>
  )
}
