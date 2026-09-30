"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, ShieldCheck } from "lucide-react"

export default function OperationSearchPage() {
  const router = useRouter()
  const [operationId, setOperationId] = useState("")
  const [error, setError] = useState("")

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = operationId.trim()
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      setError("Introduce un operation_id UUID válido.")
      return
    }
    setError("")
    router.push(`/security/operations/${encodeURIComponent(value)}`)
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-6 text-[var(--primary)]" aria-hidden="true" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--primary)]">Seguridad · Operaciones</p>
            <h1 className="mt-2 text-2xl font-black">Reconstruir una operación</h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Consulta el timeline completo mediante el identificador operativo compartido.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-3">
          <label htmlFor="operation-id" className="text-sm font-black">operation_id</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="operation-id"
              value={operationId}
              onChange={(event) => setOperationId(event.target.value)}
              placeholder="00000000-0000-4000-8000-000000000000"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 font-mono text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white">
              <Search className="size-4" aria-hidden="true" />
              Reconstruir
            </button>
          </div>
          {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
        </form>
      </section>
    </main>
  )
}
