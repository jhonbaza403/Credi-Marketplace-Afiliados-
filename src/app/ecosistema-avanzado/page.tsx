'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BarChart3, Bot, Code2, Coins, Handshake, LayoutGrid, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react'

type Json = Record<string, unknown>

async function getJson(url: string): Promise<Json> {
  const response = await fetch(url, { cache: 'no-store' })
  const raw: unknown = await response.json().catch(() => ({}))
  const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Json : {}
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'REQUEST_FAILED')
  return data
}

export default function AdvancedCommercePage() {
  const [wallet, setWallet] = useState<Json | null>(null)
  const [payments, setPayments] = useState<Json[]>([])
  const [negotiations, setNegotiations] = useState<Json[]>([])
  const [risk, setRisk] = useState<Json | null>(null)
  const [analytics, setAnalytics] = useState<Json | null>(null)
  const [apps, setApps] = useState<Json[]>([])
  const [status, setStatus] = useState('Listo para operar')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('stripe')
  const [recipient, setRecipient] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [appName, setAppName] = useState('')
  const [appSlug, setAppSlug] = useState('')

  async function refresh() {
    try {
      setStatus('Sincronizando Credi OS…')
      const [w, p, n, r, a, m] = await Promise.all([
        getJson('/api/wallet'), getJson('/api/payments/orchestrator'), getJson('/api/negotiations'), getJson('/api/risk/signal'), getJson('/api/analytics/predictive'), getJson('/api/apps/marketplace'),
      ])
      setWallet(w.wallet && typeof w.wallet === 'object' ? w.wallet as Json : null); setPayments(Array.isArray(p.payments) ? p.payments as Json[] : []); setNegotiations(Array.isArray(n.negotiations) ? n.negotiations as Json[] : []); setRisk(r.signal && typeof r.signal === 'object' ? r.signal as Json : null); setAnalytics(a); setApps(Array.isArray(m.apps) ? m.apps as Json[] : [])
      setStatus('Datos sincronizados')
    } catch (error) { setStatus(error instanceof Error ? error.message : 'No fue posible sincronizar') }
  }

  useEffect(() => { void refresh() }, [])

  async function createPayment() {
    const amount = Number(paymentAmount)
    if (!Number.isFinite(amount) || amount <= 0) return setStatus('Indica un importe válido.')
    try {
      const result = await fetch('/api/payments/orchestrator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, currency: 'USD', method_type: paymentMethod, client_reference: 'Credi Advanced Commerce' }) })
      const raw: unknown = await result.json(); const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Json : {}; if (!result.ok) throw new Error(typeof data.error === 'string' ? data.error : 'No fue posible crear el pago')
      setPaymentAmount(''); const payment = data.payment && typeof data.payment === 'object' ? data.payment as Json : {}; setStatus(`Intento creado: ${String(payment.id ?? 'sin ID')}`); await refresh()
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Error de pago') }
  }

  async function transfer() {
    const amount = Number(transferAmount)
    if (!recipient || !Number.isFinite(amount) || amount <= 0) return setStatus('Completa destinatario e importe para la transferencia.')
    try {
      const response = await fetch('/api/wallet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to_user_id: recipient, amount, currency: 'USD' }) })
      const raw: unknown = await response.json(); const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Json : {}; if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Transferencia fallida')
      setTransferAmount(''); setRecipient(''); setStatus('Transferencia interna registrada.'); await refresh()
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Error de wallet') }
  }

  async function createDeveloperApp() {
    if (!appName || !appSlug) return setStatus('Completa nombre y slug de la aplicación.')
    try {
      const response = await fetch('/api/developer/apps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: appName, slug: appSlug, scopes: ['catalog:read'] }) })
      const raw: unknown = await response.json(); const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Json : {}; if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'No fue posible crear la app')
      const app = data.app && typeof data.app === 'object' ? data.app as Json : {}; setAppName(''); setAppSlug(''); setStatus(`App creada: ${String(app.slug ?? 'sin slug')}`)
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Error de Developer Platform') }
  }

  const cards = [
    { href: '/negociaciones', icon: Handshake, label: 'Negociación avanzada', text: 'Contraofertas, límites, rondas y modo adaptativo gobernado.' },
    { href: '/pagos', icon: Coins, label: 'Payment Orchestrator', text: 'Stripe, cripto, transferencia bancaria, wallet y manual en una misma capa.' },
    { href: '/wallet', icon: WalletCards, label: 'Credi Wallet', text: 'Saldo disponible, ledger e idempotencia para movimientos internos.' },
    { href: '/analytics', icon: BarChart3, label: 'Analytics predictivo', text: 'Volumen observado, tendencia y pronóstico operativo de corto plazo.' },
    { href: '/developer', icon: Code2, label: 'Developer Platform', text: 'Apps, scopes y claves API hasheadas para integraciones externas.' },
    { href: '/apps', icon: LayoutGrid, label: 'App Marketplace', text: 'Registro y publicación de aplicaciones que amplían Credi.' },
  ]

  const walletBalance = wallet?.available_balance
  const walletCurrency = wallet?.currency
  const walletPending = wallet?.pending_balance
  const walletLedger = Array.isArray(wallet?.ledger) ? wallet.ledger.length : null
  const riskScore = risk?.score
  const riskLevel = risk?.level
  const analyticsForecast = analytics?.forecast_next_7_days_volume
  const analyticsConfidence = analytics?.confidence
  const analyticsTrend = analytics?.trend_daily

  return <main className="min-h-screen bg-background text-foreground"><div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
    <section className="rounded-[2rem] border border-border bg-card p-7 shadow-sm sm:p-10"><div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-4xl"><div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-primary"><Bot className="size-3.5"/> Credi Advanced Commerce</div><h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">La capa avanzada del ecosistema Credi</h1><p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">Negocia, cobra, administra wallet, mide el negocio, integra software externo y prepara Credi para comercio ejecutado por agentes.</p></div><div className="flex items-center gap-3"><span className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs font-bold">{status}</span><button onClick={refresh} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground"><RefreshCw className="size-4"/>Sincronizar</button></div></div></section>

    <section className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{cards.map(({href,icon:Icon,label,text})=><Link key={href} href={href} className="group rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"><div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-6"/></div><h2 className="mt-5 text-xl font-black">{label}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-primary">Abrir módulo <ArrowRight className="size-4"/></span></Link>)}</section>

    <section className="mt-7 grid gap-5 xl:grid-cols-[.95fr_1.05fr]"><div className="rounded-3xl border border-border bg-card p-6"><div className="flex items-center gap-3"><WalletCards className="size-5 text-primary"/><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-primary">Wallet</p><h2 className="text-xl font-black">Saldo operativo</h2></div></div><p className="mt-5 text-4xl font-black">{wallet ? `${Number(walletBalance ?? 0).toLocaleString('es-ES',{minimumFractionDigits:2})} ${String(walletCurrency ?? 'USD')}` : '—'}</p><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-border bg-muted/30 p-4"><p className="text-xs text-muted-foreground">Pendiente</p><p className="mt-1 text-lg font-black">{wallet ? Number(walletPending ?? 0).toLocaleString('es-ES') : '—'}</p></div><div className="rounded-2xl border border-border bg-muted/30 p-4"><p className="text-xs text-muted-foreground">Movimientos</p><p className="mt-1 text-lg font-black">{walletLedger ?? '—'}</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><input value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="ID del destinatario" className="rounded-xl border border-border bg-background px-3 py-3 text-sm"/><input value={transferAmount} onChange={e=>setTransferAmount(e.target.value)} placeholder="Importe USD" type="number" min="0" className="rounded-xl border border-border bg-background px-3 py-3 text-sm"/></div><button onClick={transfer} className="mt-3 w-full rounded-xl border border-border px-4 py-3 text-sm font-black hover:bg-muted">Registrar transferencia interna</button></div>

    <div className="rounded-3xl border border-border bg-card p-6"><div className="flex items-center gap-3"><Coins className="size-5 text-primary"/><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-primary">Orchestrator</p><h2 className="text-xl font-black">Crear intención de pago</h2></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><input value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} placeholder="Importe USD" type="number" min="0" className="rounded-xl border border-border bg-background px-3 py-3 text-sm"/><select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-3 text-sm"><option value="stripe">Stripe</option><option value="crypto">Crypto</option><option value="bank_transfer">Transferencia bancaria</option><option value="wallet">Credi Wallet</option><option value="manual">Manual</option></select></div><button onClick={createPayment} className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground">Crear intención</button><div className="mt-5 space-y-2">{payments.slice(0,4).map(p=><div key={String(p.id)} className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3 text-xs"><span className="font-bold">{String(p.method_type ?? '')}</span><span>{Number(p.amount ?? 0).toLocaleString('es-ES')} {String(p.currency ?? '')}</span><span className="font-black uppercase">{String(p.status ?? '')}</span></div>)}</div></div></section>

    <section className="mt-7 grid gap-5 lg:grid-cols-3"><div className="rounded-3xl border border-border bg-card p-6"><p className="text-[10px] font-black uppercase tracking-[.18em] text-primary">Riesgo operativo</p><h2 className="mt-1 text-xl font-black">Señal de confianza</h2><p className="mt-4 text-5xl font-black">{riskScore != null ? Math.round(Number(riskScore)) : '—'}<span className="text-lg text-muted-foreground">/100</span></p><p className="mt-2 text-sm text-muted-foreground">Nivel: <strong>{String(riskLevel ?? '—')}</strong></p><div className="mt-4 flex items-start gap-3 rounded-2xl bg-muted/30 p-4"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary"/><p className="text-xs leading-5 text-muted-foreground">Señal descriptiva para operaciones de marketplace. No determina crédito, financiación ni elegibilidad financiera.</p></div></div><div className="rounded-3xl border border-border bg-card p-6"><p className="text-[10px] font-black uppercase tracking-[.18em] text-primary">Analytics</p><h2 className="mt-1 text-xl font-black">Próximos 7 días</h2><p className="mt-4 text-4xl font-black">{analyticsForecast != null ? Number(analyticsForecast).toLocaleString('es-ES') : '—'}</p><p className="mt-2 text-sm text-muted-foreground">volumen estimado · confianza {String(analyticsConfidence ?? '—')}</p><p className="mt-4 text-xs leading-5 text-muted-foreground">Tendencia diaria: {analyticsTrend != null ? Number(analyticsTrend).toLocaleString('es-ES') : '—'}</p></div><div className="rounded-3xl border border-border bg-card p-6"><p className="text-[10px] font-black uppercase tracking-[.18em] text-primary">Negociaciones</p><h2 className="mt-1 text-xl font-black">Pipeline activo</h2><p className="mt-4 text-4xl font-black">{negotiations.filter(n=>n.state==='open').length}</p><p className="mt-2 text-sm text-muted-foreground">de {negotiations.length} conversaciones comerciales.</p><Link href="/negociaciones" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-primary">Gestionar <ArrowRight className="size-4"/></Link></div></section>

    <section className="mt-7 grid gap-5 xl:grid-cols-[1fr_.8fr]"><div className="rounded-3xl border border-border bg-card p-6"><p className="text-[10px] font-black uppercase tracking-[.18em] text-primary">Developer Platform</p><h2 className="mt-1 text-xl font-black">Crea tu aplicación</h2><p className="mt-2 text-sm text-muted-foreground">El primer scope disponible conecta aplicaciones externas con el catálogo Credi.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><input value={appName} onChange={e=>setAppName(e.target.value)} placeholder="Nombre de la app" className="rounded-xl border border-border bg-background px-3 py-3 text-sm"/><input value={appSlug} onChange={e=>setAppSlug(e.target.value)} placeholder="slug-publico" className="rounded-xl border border-border bg-background px-3 py-3 text-sm"/></div><button onClick={createDeveloperApp} className="mt-3 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground">Registrar aplicación</button></div><div className="rounded-3xl border border-border bg-card p-6"><p className="text-[10px] font-black uppercase tracking-[.18em] text-primary">App Marketplace</p><h2 className="mt-1 text-xl font-black">Apps publicadas</h2><div className="mt-4 space-y-3">{apps.length ? apps.slice(0,5).map(a=><div key={String(a.id)} className="rounded-2xl border border-border p-4"><p className="font-black">{String(a.name ?? '')}</p><p className="mt-1 text-xs text-muted-foreground">{String(a.category ?? '')} · {String(a.pricing_model ?? '')}</p></div>) : <p className="rounded-2xl bg-muted/30 p-4 text-sm text-muted-foreground">Todavía no hay aplicaciones publicadas.</p>}</div></div></section>
  </div></main>
}
