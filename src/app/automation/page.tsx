'use client'

import { useState } from 'react'

export default function AutomationPage() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<{ evaluated?: number; executed?: number; results?: Array<{ name: string; action_type: string; details: Record<string, unknown> }> } | null>(null)

  async function runAutomation() {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/automation/run', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const payload = await response.json().catch(() => ({}))
      if (response.status === 401) {
        window.location.assign(`/login?next=${encodeURIComponent('/automation')}`)
        return
      }
      if (!response.ok) throw new Error(payload.error || 'No fue posible ejecutar las reglas.')
      setResult(payload)
      setMessage(`Se evaluaron ${payload.evaluated ?? 0} reglas y se ejecutaron ${payload.executed ?? 0}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible ejecutar la automatización.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
    <div className="mx-auto max-w-5xl">
      <section className="rounded-[2rem] border border-border bg-card p-7 shadow-sm sm:p-10">
        <p className="text-xs font-black uppercase tracking-[.22em] text-primary">CREDI-AUTOMATION</p>
        <h1 className="mt-3 text-3xl font-black sm:text-5xl">Automatización gobernada</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">Evalúa las reglas activas de tu cuenta y ejecuta únicamente las acciones soportadas por el motor. Cada ejecución queda registrada en auditoría.</p>
        <button type="button" onClick={runAutomation} disabled={busy} className="mt-7 rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground disabled:opacity-50">{busy ? 'Ejecutando…' : 'Ejecutar reglas ahora'}</button>
        {message && <p role="status" className="mt-5 rounded-2xl border border-border bg-muted p-4 text-sm">{message}</p>}
      </section>
      {result?.results?.length ? <section className="mt-6 space-y-3">{result.results.map((item) => <article key={`${item.name}-${item.action_type}`} className="rounded-2xl border border-border bg-card p-5"><h2 className="font-black">{item.name}</h2><p className="mt-1 text-sm text-muted-foreground">{item.action_type}</p><pre className="mt-3 overflow-auto rounded-xl bg-muted p-3 text-xs">{JSON.stringify(item.details, null, 2)}</pre></article>)}</section> : null}
    </div>
  </main>
}
