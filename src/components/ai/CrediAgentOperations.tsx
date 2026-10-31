'use client'

import { useMemo, useState } from 'react'
import { Activity, AlertCircle, ArrowRight, Bot, CheckCircle2, CircleDollarSign, Loader2, LockKeyhole, PackageSearch, Send, ShieldCheck, Sparkles } from 'lucide-react'

type AgentAction = 'inventory_summary' | 'b2b_pipeline' | 'prepare_rfq_followup' | 'publish_offer' | 'send_commercial_message' | 'create_payment'
type AgentResult = Record<string, unknown>
type PendingApproval = {
  action: AgentAction
  request_id: string
  approval_token: string
  body: Record<string, unknown>
  expires_at?: string
}

const ACTIONS: Array<{ value: AgentAction; label: string; description: string; level: 'Consulta' | 'Requiere aprobación'; resource: boolean }> = [
  { value: 'inventory_summary', label: 'Consultar inventario', description: 'Resume productos, unidades disponibles y referencias con stock bajo.', level: 'Consulta', resource: false },
  { value: 'b2b_pipeline', label: 'Consultar pipeline B2B', description: 'Cuenta solicitudes de cotización abiertas y automatizaciones activas.', level: 'Consulta', resource: false },
  { value: 'prepare_rfq_followup', label: 'Preparar seguimiento de cotización', description: 'Prepara un mensaje de seguimiento para una solicitud B2B propia.', level: 'Requiere aprobación', resource: true },
  { value: 'publish_offer', label: 'Publicar una oferta', description: 'Crea una oferta activa asociada a un anuncio propio.', level: 'Requiere aprobación', resource: true },
  { value: 'send_commercial_message', label: 'Enviar mensaje comercial', description: 'Envía un mensaje en una conversación a la que perteneces.', level: 'Requiere aprobación', resource: true },
  { value: 'create_payment', label: 'Preparar pago de pedido', description: 'Crea un intento de pago; no realiza por sí solo el cargo bancario.', level: 'Requiere aprobación', resource: true },
]

const inputClass = 'mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15'
const labelClass = 'block text-xs font-bold text-muted-foreground'

export default function CrediAgentOperations() {
  const [action, setAction] = useState<AgentAction>('inventory_summary')
  const [resourceId, setResourceId] = useState('')
  const [title, setTitle] = useState('')
  const [offerPrice, setOfferPrice] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [message, setMessage] = useState('')
  const [methodType, setMethodType] = useState('manual')
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState<PendingApproval | null>(null)
  const [result, setResult] = useState<AgentResult | null>(null)
  const [error, setError] = useState('')

  const selected = useMemo(() => ACTIONS.find((item) => item.value === action)!, [action])
  const needsResource = selected.resource
  const canPrepare = !loading && (!needsResource || resourceId.trim().length > 0) &&
    (action !== 'publish_offer' || (title.trim().length > 0 && offerPrice.trim().length > 0 && endsAt.length > 0)) &&
    (action !== 'send_commercial_message' || message.trim().length > 0)

  function buildBody(): Record<string, unknown> {
    return {
      action,
      ...(resourceId.trim() ? { resource_id: resourceId.trim() } : {}),
      ...(action === 'publish_offer' ? { title: title.trim(), offer_price: Number(offerPrice), ends_at: new Date(endsAt).toISOString() } : {}),
      ...(action === 'send_commercial_message' ? { message: message.trim() } : {}),
      ...(action === 'create_payment' ? { method_type: methodType } : {}),
    }
  }

  async function callAgent(body: Record<string, unknown>) {
    const response = await fetch('/api/ai/agent', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({})) as AgentResult
    if (!response.ok) {
      const code = typeof data.error === 'string' ? data.error : `HTTP_${response.status}`
      throw new Error(code)
    }
    return { status: response.status, data }
  }

  async function prepare() {
    if (!canPrepare) return
    setLoading(true); setError(''); setResult(null); setPending(null); setConfirmed(false)
    try {
      const body = { ...buildBody(), request_id: crypto.randomUUID() }
      const response = await callAgent(body)
      if (response.data.status === 'approval_required' && typeof response.data.approval_token === 'string' && typeof response.data.request_id === 'string') {
        setPending({
          action,
          request_id: response.data.request_id,
          approval_token: response.data.approval_token,
          body,
          expires_at: typeof response.data.approval_expires_at === 'string' ? response.data.approval_expires_at : undefined,
        })
      } else {
        setResult(response.data)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible completar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  async function authorizeAndExecute() {
    if (!pending || !confirmed || loading) return
    setLoading(true); setError('')
    try {
      const response = await callAgent({
        ...pending.body,
        approved: true,
        request_id: pending.request_id,
        approval_token: pending.approval_token,
      })
      setResult(response.data)
      setPending(null)
      setConfirmed(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible ejecutar la operación.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mt-8 overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Bot className="size-6" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-primary">Credi Intelligence · Operaciones</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Dile qué necesitas. Credi prepara y ejecuta.</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700"><ShieldCheck className="size-3.5" /> Permisos y auditoría</span>
        </div>
        <p className="mt-4 max-w-4xl text-sm leading-6 text-muted-foreground">Esta consola conecta con operaciones reales habilitadas en el backend. Las consultas se ejecutan directamente; publicar, enviar mensajes, preparar pagos y otras acciones de escritura requieren una aprobación separada y temporal.</p>
      </div>

      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[.9fr_1.1fr]">
        <div className="space-y-4">
          <label className={labelClass}>Operación disponible
            <select className={inputClass} value={action} onChange={(event) => { setAction(event.target.value as AgentAction); setPending(null); setResult(null); setError(''); setConfirmed(false) }}>
              {ACTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-black"><Sparkles className="size-4 text-primary" /> {selected.label}</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{selected.description}</p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{selected.level === 'Consulta' ? <Activity className="size-3.5" /> : <LockKeyhole className="size-3.5" />}{selected.level}</p>
          </div>

          {needsResource && <label className={labelClass}>Identificador del recurso
            <input className={inputClass} value={resourceId} onChange={(event) => setResourceId(event.target.value)} placeholder={action === 'send_commercial_message' ? 'ID de conversación' : action === 'create_payment' ? 'ID del pedido' : action === 'prepare_rfq_followup' ? 'ID de solicitud B2B' : 'ID de anuncio propio'} />
          </label>}

          {action === 'publish_offer' && <>
            <label className={labelClass}>Título de la oferta<input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} /></label>
            <label className={labelClass}>Precio de oferta<input className={inputClass} type="number" min="0" step="0.01" value={offerPrice} onChange={(event) => setOfferPrice(event.target.value)} /></label>
            <label className={labelClass}>Válida hasta<input className={inputClass} type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></label>
          </>}

          {action === 'send_commercial_message' && <label className={labelClass}>Mensaje a enviar<textarea className={inputClass} rows={4} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} /></label>}

          {action === 'create_payment' && <label className={labelClass}>Método de pago
            <select className={inputClass} value={methodType} onChange={(event) => setMethodType(event.target.value)}>
              <option value="manual">Manual / requiere acción</option><option value="stripe">Stripe</option><option value="crypto">Cripto</option><option value="bank_transfer">Transferencia bancaria</option><option value="wallet">Billetera</option>
            </select>
          </label>}

          <button type="button" disabled={!canPrepare} onClick={() => void prepare()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? <Loader2 className="size-4 animate-spin" /> : selected.level === 'Consulta' ? <PackageSearch className="size-4" /> : <ArrowRight className="size-4" />}
            {loading ? 'Procesando…' : selected.level === 'Consulta' ? 'Consultar ahora' : 'Preparar operación'}
          </button>
        </div>

        <div className="min-w-0 space-y-4">
          {pending ? <div className="rounded-2xl border border-amber-400/40 bg-amber-50 p-5 text-amber-950">
            <div className="flex items-center gap-2 font-black"><LockKeyhole className="size-5" /> Autorización requerida</div>
            <p className="mt-2 text-sm leading-6">La operación está preparada, pero todavía no se ha ejecutado. Revisa los datos y autorízala expresamente. El permiso es de un solo uso y caduca en 10 minutos.</p>
            {pending.expires_at && <p className="mt-2 text-xs font-semibold">Caduca: {new Date(pending.expires_at).toLocaleString()}</p>}
            <label className="mt-4 flex items-start gap-2 text-sm font-semibold"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 size-4 accent-current" />He revisado la operación y autorizo a Credi a ejecutarla.</label>
            <button type="button" disabled={!confirmed || loading} onClick={() => void authorizeAndExecute()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Autorizar y ejecutar</button>
            <button type="button" onClick={() => { setPending(null); setConfirmed(false) }} className="mt-2 w-full rounded-xl border border-amber-900/20 px-4 py-2.5 text-xs font-bold">Cancelar autorización</button>
          </div> : null}

          {error ? <div role="alert" className="flex items-start gap-2 rounded-2xl border border-red-300/40 bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="mt-0.5 size-4 shrink-0" />No se completó la operación: {error}</div> : null}

          {result ? <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5">
            <div className="flex items-center gap-2 text-sm font-black text-emerald-700"><CheckCircle2 className="size-5" />Respuesta del servicio</div>
            <p className="mt-1 text-xs text-muted-foreground">Resultado devuelto por el backend. Comprueba el detalle antes de continuar.</p>
            <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-background p-4 text-xs leading-5 text-foreground">{JSON.stringify(result, null, 2)}</pre>
          </div> : null}

          {!pending && !result && !error ? <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
            <CircleDollarSign className="size-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-black">Panel de resultados y autorizaciones</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">Los resultados, las solicitudes de aprobación y los errores aparecerán aquí. Credi no marcará como realizada una tarea que el servicio no confirme.</p>
          </div> : null}
        </div>
      </div>
      <div className="flex items-start gap-2 border-t border-border bg-muted/20 px-6 py-4 text-xs leading-5 text-muted-foreground sm:px-8"><Send className="mt-0.5 size-3.5 shrink-0" />La consola solo muestra las seis operaciones que hoy tienen manejadores reales. Las demás áreas se integrarán mediante conectores específicos, con permisos propios, trazabilidad y pruebas de extremo a extremo.</div>
    </section>
  )
}
