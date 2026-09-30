"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, ShieldCheck, XCircle } from "lucide-react"

type OperationEvent = {
  id: string
  occurred_at: string
  event_type: string
  source: string
  status: "info" | "pending" | "success" | "warning" | "error"
  severity: "low" | "normal" | "high" | "critical"
  entity_type: string | null
  entity_id: string | null
  message: string
  error_code: string | null
  metadata: Record<string, unknown>
}

type OperationData = {
  operation_id: string
  status: string
  error_count: number
  order_id: string | null
  timeline: OperationEvent[]
}

function EventIcon({ status }: { status: OperationEvent["status"] }) {
  if (status === "success") return <CheckCircle2 className="size-5" aria-hidden="true" />
  if (status === "error") return <XCircle className="size-5" aria-hidden="true" />
  if (status === "warning") return <AlertTriangle className="size-5" aria-hidden="true" />
  return <Clock3 className="size-5" aria-hidden="true" />
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value))
}

export default function OperationObservabilityPage({
  params,
}: {
  params: Promise<{ operation_id: string }>
}) {
  const [operation, setOperation] = useState<OperationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { operation_id: operationId } = await params
      const response = await fetch(`/api/operations/${encodeURIComponent(operationId)}`, {
        cache: "no-store",
        credentials: "include",
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "No fue posible cargar la operación.")
      }
      setOperation(payload.data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar la operación.")
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    void load()
  }, [load])

  const events = useMemo(() => operation?.timeline ?? [], [operation])

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--primary)]">Observabilidad operativa</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--foreground)]">Reconstrucción de operación</h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--muted-foreground)]">
            Línea de tiempo unificada de comercio, checkout, pago, webhook, afiliación, settlement, Wallet y notificaciones.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/security" className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-bold">
            Seguridad
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-black text-white disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Actualizar
          </button>
        </div>
      </div>

      {loading && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-sm font-semibold">
          Reconstruyendo la operación…
        </section>
      )}

      {error && !loading && (
        <section role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-5 text-sm font-semibold text-red-900">
          {error}
        </section>
      )}

      {operation && !loading && (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <span className="text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)]">Estado</span>
              <p className="mt-2 text-lg font-black">{operation.status}</p>
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <span className="text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)]">Eventos</span>
              <p className="mt-2 text-lg font-black">{events.length}</p>
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <span className="text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)]">Errores</span>
              <p className="mt-2 text-lg font-black">{operation.error_count}</p>
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <span className="text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)]">Orden</span>
              <p className="mt-2 truncate text-sm font-black">{operation.order_id ?? "—"}</p>
            </article>
          </section>

          <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
            <div className="mb-6 flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-6 text-[var(--primary)]" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="text-lg font-black">Operation ID</h2>
                <p className="mt-1 break-all font-mono text-xs text-[var(--muted-foreground)]">{operation.operation_id}</p>
              </div>
            </div>

            <ol className="space-y-5" aria-label="Timeline de la operación">
              {events.map((event) => (
                <li key={event.id} className="relative pl-9">
                  <span className="absolute left-0 top-0.5 grid size-7 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)]">
                    <EventIcon status={event.status} />
                  </span>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-black">{event.message}</p>
                        <p className="mt-1 text-xs font-semibold text-[var(--muted-foreground)]">
                          {event.source} · {event.event_type}
                        </p>
                      </div>
                      <time className="text-xs font-medium text-[var(--muted-foreground)]">{formatDate(event.occurred_at)}</time>
                    </div>
                    {(event.status === "error" || event.error_code) && (
                      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
                        <strong>Error:</strong> {event.error_code ?? "Evento marcado como error"}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            {!events.length && (
              <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--muted-foreground)]">
                No existen eventos registrados para este operation_id.
              </p>
            )}
          </section>
        </>
      )}
    </main>
  )
}
