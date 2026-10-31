'use client'

import { useMemo, useState } from 'react'
import { Activity, AlertCircle, ArrowRight, Bot, CheckCircle2, CircleDollarSign, Loader2, LockKeyhole, PackageSearch, Send, ShieldCheck, Sparkles } from 'lucide-react'

type AgentAction =
  | 'inventory_summary' | 'b2b_pipeline' | 'prepare_rfq_followup' | 'publish_offer'
  | 'send_commercial_message' | 'create_payment' | 'commerce_summary' | 'affiliate_summary'
  | 'chat_summary' | 'live_summary' | 'social_summary' | 'support_summary'
  | 'create_support_case' | 'create_b2b_rfq' | 'create_social_post'

type AgentResult = Record<string, unknown>
type PendingApproval = {
  action: AgentAction
  request_id: string
  approval_token: string
  body: Record<string, unknown>
  expires_at?: string
}

const ACTIONS: Array<{ value: AgentAction; label: string; module: string; description: string; level: 'Consulta' | 'Requiere aprobación'; resource: boolean }> = [
  { value: 'commerce_summary', label: 'Resumen de comercio', module: 'Marketplace', description: 'Consulta el catálogo de tu tienda, productos activos y niveles de inventario.', level: 'Consulta', resource: false },
  { value: 'inventory_summary', label: 'Diagnóstico de inventario', module: 'Marketplace', description: 'Resume productos, unidades disponibles y referencias con stock bajo.', level: 'Consulta', resource: false },
  { value: 'social_summary', label: 'Actividad social', module: 'Muro y Reels', description: 'Cuenta tus publicaciones, historias y Reels sin cambiar su estado de moderación.', level: 'Consulta', resource: false },
  { value: 'create_social_post', label: 'Crear publicación de texto', module: 'Muro y Reels', description: 'Crea una publicación en tu perfil. La moderación decide cuándo puede verse públicamente.', level: 'Requiere aprobación', resource: false },
  { value: 'chat_summary', label: 'Resumen de Credi Chat', module: 'Chat', description: 'Consulta tus conversaciones y el volumen reciente de mensajes a los que tienes acceso.', level: 'Consulta', resource: false },
  { value: 'live_summary', label: 'Estado de Credi LIVE', module: 'LIVE', description: 'Resume tus salas, transmisiones activas y repeticiones registradas.', level: 'Consulta', resource: false },
  { value: 'affiliate_summary', label: 'Resumen de afiliación', module: 'Afiliados', description: 'Consulta enlaces, clics y conversiones registradas. El saldo de liquidación permanece protegido.', level: 'Consulta', resource: false },
  { value: 'b2b_pipeline', label: 'Pipeline B2B', module: 'B2B', description: 'Cuenta tus solicitudes de cotización abiertas y automatizaciones activas.', level: 'Consulta', resource: false },
  { value: 'create_b2b_rfq', label: 'Crear solicitud de cotización', module: 'B2B', description: 'Registra una solicitud B2B en tu nombre para que proveedores de la red puedan responder.', level: 'Requiere aprobación', resource: false },
  { value: 'prepare_rfq_followup', label: 'Preparar seguimiento de cotización', module: 'B2B', description: 'Prepara un mensaje de seguimiento para una solicitud B2B propia.', level: 'Requiere aprobación', resource: true },
  { value: 'publish_offer', label: 'Crear oferta comercial', module: 'Marketplace', description: 'Crea una oferta activa asociada a un anuncio propio.', level: 'Requiere aprobación', resource: true },
  { value: 'send_commercial_message', label: 'Enviar mensaje comercial', module: 'Chat', description: 'Envía un mensaje en una conversación a la que perteneces.', level: 'Requiere aprobación', resource: true },
  { value: 'create_payment', label: 'Preparar intento de pago', module: 'Pagos', description: 'Crea un intento de pago de un pedido propio. No realiza por sí solo el cargo bancario.', level: 'Requiere aprobación', resource: true },
  { value: 'support_summary', label: 'Estado de mis casos', module: 'Atención', description: 'Consulta tus casos de soporte, prioridades y estados.', level: 'Consulta', resource: false },
  { value: 'create_support_case', label: 'Abrir caso de soporte', module: 'Atención', description: 'Registra un caso de soporte y crea su primer evento de seguimiento.', level: 'Requiere aprobación', resource: false },
]

const inputClass = 'mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15'
const labelClass = 'block text-xs font-bold text-muted-foreground'

export default function CrediAgentOperations() {
  const [action, setAction] = useState<AgentAction>('commerce_summary')
  const [resourceId, setResourceId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contentBody, setContentBody] = useState('')
  const [category, setCategory] = useState('other')
  const [offerPrice, setOfferPrice] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [message, setMessage] = useState('')
  const [methodType, setMethodType] = useState('manual')
  const [quantity, setQuantity] = useState('1')
  const [currency, setCurrency] = useState('USD')
  const [targetPrice, setTargetPrice] = useState('')
  const [deliveryCountry, setDeliveryCountry] = useState('')
  const [neededBy, setNeededBy] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState<PendingApproval | null>(null)
  const [result, setResult] = useState<AgentResult | null>(null)
  const [error, setError] = useState('')

  const selected = useMemo(() => ACTIONS.find((item) => item.value === action)!, [action])
  const needsResource = selected.resource
  const isSocialPost = action === 'create_social_post'
  const isSupportCase = action === 'create_support_case'
  const isB2bRfq = action === 'create_b2b_rfq'
  const canPrepare = !loading &&
    (!needsResource || resourceId.trim().length > 0) &&
    (action !== 'publish_offer' || (title.trim().length > 0 && offerPrice.trim().length > 0 && endsAt.length > 0 && Number.isFinite(Number(offerPrice)) && Number(offerPrice) >= 0)) &&
    (action !== 'send_commercial_message' || message.trim().length > 0) &&
    (!isSupportCase || (title.trim().length >= 5 && description.trim().length >= 10)) &&
    (!isB2bRfq || (title.trim().length >= 3 && description.trim().length >= 10 && Number.isFinite(Number(quantity)) && Number(quantity) > 0 && /^[A-Z]{3}$/.test(currency.toUpperCase()))) &&
    (!isSocialPost || contentBody.trim().length > 0)

  function buildBody(): Record<string, unknown> {
    return {
      action,
      ...(resourceId.trim() ? { resource_id: resourceId.trim() } : {}),
      ...(action === 'publish_offer' ? { title: title.trim(), offer_price: Number(offerPrice), ends_at: new Date(endsAt).toISOString() } : {}),
      ...(action === 'send_commercial_message' ? { message: message.trim() } : {}),
      ...(action === 'create_payment' ? { method_type: methodType } : {}),
      ...(isSupportCase ? { title: title.trim(), description: description.trim(), category } : {}),
      ...(isB2bRfq ? {
        title: title.trim(), description: description.trim(), quantity: Number(quantity), currency: currency.toUpperCase(),
        ...(targetPrice.trim() ? { target_unit_price: Number(targetPrice) } : {}),
        ...(deliveryCountry.trim() ? { delivery_country: deliveryCountry.trim().toUpperCase() } : {}),
        ...(neededBy ? { needed_by: neededBy } : {}),
      } : {}),
      ...(isSocialPost ? { title: title.trim(), body: contentBody.trim(), visibility } : {}),
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
    return data
  }

  async function prepare() {
    if (!canPrepare) return
    setLoading(true); setError(''); setResult(null); setPending(null); setConfirmed(false)
    try {
      const body = { ...buildBody(), request_id: crypto.randomUUID() }
      const response = await callAgent(body)
      if (response.status === 'approval_required' && typeof response.approval_token === 'string' && typeof response.request_id === 'string') {
        setPending({
          action,
          request_id: response.request_id,
          approval_token: response.approval_token,
          body,
          expires_at: typeof response.approval_expires_at === 'string' ? response.approval_expires_at : undefined,
        })
      } else {
        setResult(response)
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
      setResult(response)
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
            <h2 className="mt-1 text-2xl font-black tracking-tight">Una consola para operar Credi</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700"><ShieldCheck className="size-3.5" /> Permisos y auditoría</span>
        </div>
        <p className="mt-4 max-w-4xl text-sm leading-6 text-muted-foreground">Consultas con acceso propio, operaciones de escritura con aprobación temporal de un solo uso, y trazabilidad por solicitud. La autorización queda vinculada exactamente a los datos revisados; cambiar un importe, destinatario o contenido invalida la aprobación.</p>
      </div>

      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[.9fr_1.1fr]">
        <div className="space-y-4">
          <label className={labelClass}>Módulo y operación
            <select className={inputClass} value={action} onChange={(event) => { setAction(event.target.value as AgentAction); setPending(null); setResult(null); setError(''); setConfirmed(false); setResourceId('') }}>
              {ACTIONS.map((item) => <option key={item.value} value={item.value}>{item.module} · {item.label}</option>)}
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

          {isSupportCase && <>
            <label className={labelClass}>Título del caso<input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} /></label>
            <label className={labelClass}>Categoría
              <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}>
                {['account','orders','payments','products','chat','affiliate','b2b','live','security','technical','suggestion','other'].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className={labelClass}>Describe qué necesitas<textarea className={inputClass} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={10000} /></label>
          </>}

          {isB2bRfq && <>
            <label className={labelClass}>Qué necesitas comprar<input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={300} /></label>
            <label className={labelClass}>Descripción y especificaciones<textarea className={inputClass} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={12000} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>Cantidad<input className={inputClass} type="number" min="0.001" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
              <label className={labelClass}>Moneda<input className={inputClass} maxLength={3} value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} /></label>
              <label className={labelClass}>Precio objetivo / unidad<input className={inputClass} type="number" min="0" step="any" value={targetPrice} onChange={(event) => setTargetPrice(event.target.value)} placeholder="Opcional" /></label>
              <label className={labelClass}>País de entrega<input className={inputClass} maxLength={2} value={deliveryCountry} onChange={(event) => setDeliveryCountry(event.target.value.toUpperCase())} placeholder="US" /></label>
            </div>
            <label className={labelClass}>Fecha requerida<input className={inputClass} type="date" value={neededBy} onChange={(event) => setNeededBy(event.target.value)} /></label>
          </>}

          {isSocialPost && <>
            <label className={labelClass}>Título (opcional)<input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} /></label>
            <label className={labelClass}>Texto de la publicación<textarea className={inputClass} rows={5} value={contentBody} onChange={(event) => setContentBody(event.target.value)} maxLength={10000} /></label>
            <label className={labelClass}>Visibilidad
              <select className={inputClass} value={visibility} onChange={(event) => setVisibility(event.target.value as 'public' | 'private')}><option value="public">Pública (después de moderación)</option><option value="private">Privada</option></select>
            </label>
          </>}

          <button type="button" disabled={!canPrepare} onClick={() => void prepare()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? <Loader2 className="size-4 animate-spin" /> : selected.level === 'Consulta' ? <PackageSearch className="size-4" /> : <ArrowRight className="size-4" />}
            {loading ? 'Procesando…' : selected.level === 'Consulta' ? 'Consultar ahora' : 'Revisar operación'}
          </button>
        </div>

        <div className="min-w-0 space-y-4">
          {pending ? <div className="rounded-2xl border border-amber-400/40 bg-amber-50 p-5 text-amber-950">
            <div className="flex items-center gap-2 font-black"><LockKeyhole className="size-5" /> Autorización requerida</div>
            <p className="mt-2 text-sm leading-6">La operación está preparada, pero todavía no se ha ejecutado. Revisa los datos y autorízala expresamente. El permiso es de un solo uso, está ligado a los valores mostrados y caduca en 10 minutos.</p>
            {pending.expires_at && <p className="mt-2 text-xs font-semibold">Caduca: {new Date(pending.expires_at).toLocaleString()}</p>}
            <label className="mt-4 flex items-start gap-2 text-sm font-semibold"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 size-4 accent-current" />He revisado la operación y autorizo a Credi a ejecutarla.</label>
            <button type="button" disabled={!confirmed || loading} onClick={() => void authorizeAndExecute()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Autorizar y ejecutar</button>
            <button type="button" onClick={() => { setPending(null); setConfirmed(false) }} className="mt-2 w-full rounded-xl border border-amber-900/20 px-4 py-2.5 text-xs font-bold">Cancelar autorización</button>
          </div> : null}

          {error ? <div role="alert" className="flex items-start gap-2 rounded-2xl border border-red-300/40 bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="mt-0.5 size-4 shrink-0" />No se completó la operación: {error}</div> : null}

          {result ? <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5">
            <div className="flex items-center gap-2 text-sm font-black text-emerald-700"><CheckCircle2 className="size-5" />Respuesta del servicio</div>
            <p className="mt-1 text-xs text-muted-foreground">Resultado devuelto por el backend. Una publicación social puede quedar en moderación; un intento de pago no equivale a un cargo liquidado.</p>
            <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-background p-4 text-xs leading-5 text-foreground">{JSON.stringify(result, null, 2)}</pre>
          </div> : null}

          {!pending && !result && !error ? <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
            <CircleDollarSign className="size-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-black">Panel de resultados y autorizaciones</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">Los resultados, las solicitudes de aprobación y los errores aparecerán aquí. Credi no marcará como realizada una tarea que el servicio no confirme.</p>
          </div> : null}
        </div>
      </div>
      <div className="flex items-start gap-2 border-t border-border bg-muted/20 px-6 py-4 text-xs leading-5 text-muted-foreground sm:px-8"><Send className="mt-0.5 size-3.5 shrink-0" />15 operaciones conectadas a datos y servicios existentes. Grupos/canales, aprobación de moderación, liquidaciones de afiliados y transmisión LIVE siguen sujetos a sus controles especializados; no se simulan desde este panel.</div>
    </section>
  )
}
