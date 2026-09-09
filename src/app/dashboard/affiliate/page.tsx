'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { CANONICAL_APP_URL } from '@/lib/app-url'

interface AffiliateOrder {
  total_amount: number | null
  status: string | null
}

interface AffiliateStats {
  totalReferrals: number
  completedReferrals: number
  pendingReferrals: number
  totalSales: number
  estimatedEarnings: number
}

interface AffiliateIdentity {
  id: string
  code: string
  commission_rate: number
}

const EMPTY_STATS: AffiliateStats = {
  totalReferrals: 0,
  completedReferrals: 0,
  pendingReferrals: 0,
  totalSales: 0,
  estimatedEarnings: 0,
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

function isCompletedStatus(status: string | null) {
  return status === 'completed' || status === 'paid' || status === 'delivered'
}

export default function AffiliateDashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [affiliate, setAffiliate] = useState<AffiliateIdentity | null>(null)
  const [stats, setStats] = useState<AffiliateStats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchAffiliateData = useCallback(async () => {
    if (!user) {
      setAffiliate(null)
      setStats(EMPTY_STATS)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: affiliateData, error: affiliateError } = await supabase
        .from('affiliates')
        .select('id, code, commission_rate')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (affiliateError) throw affiliateError

      if (!affiliateData) {
        setAffiliate(null)
        setStats(EMPTY_STATS)
        return
      }

      const affiliateIdentity: AffiliateIdentity = {
        id: affiliateData.id,
        code: affiliateData.code,
        commission_rate: Number(affiliateData.commission_rate ?? 0),
      }
      setAffiliate(affiliateIdentity)

      const { data, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount, status')
        .eq('affiliate_id', affiliateData.id)

      if (ordersError) throw ordersError

      const orders = (data ?? []) as AffiliateOrder[]
      const completedOrders = orders.filter((order) => isCompletedStatus(order.status))
      const pendingOrders = orders.filter(
        (order) => !isCompletedStatus(order.status) && order.status !== 'cancelled',
      )
      const totalSales = completedOrders.reduce(
        (sum, order) => sum + Number(order.total_amount ?? 0),
        0,
      )
      const commissionRate = affiliateIdentity.commission_rate / 100

      setStats({
        totalReferrals: orders.length,
        completedReferrals: completedOrders.length,
        pendingReferrals: pendingOrders.length,
        totalSales,
        estimatedEarnings: totalSales * commissionRate,
      })
    } catch (err: unknown) {
      console.error('[AffiliateDashboard] Error cargando datos:', err)
      setError('No fue posible cargar la información de afiliado. Intenta nuevamente.')
      setAffiliate(null)
      setStats(EMPTY_STATS)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading) void fetchAffiliateData()
  }, [authLoading, fetchAffiliateData])

  const affiliateLink = affiliate
    ? `${CANONICAL_APP_URL}/products?ref=${encodeURIComponent(affiliate.code)}`
    : ''

  const handleCopy = async () => {
    if (!affiliateLink) return

    try {
      await navigator.clipboard.writeText(affiliateLink)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      console.error('[AffiliateDashboard] Error copiando enlace:', err)
      setError('No fue posible copiar el enlace automáticamente.')
    }
  }

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm font-medium text-muted-foreground">Verificando sesión...</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
          <h1 className="text-2xl font-black text-foreground">Acceso restringido</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Debes iniciar sesión para acceder a tu panel de afiliado.
          </p>
          <Link
            href="/login?next=%2Fdashboard%2Faffiliate"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            Iniciar sesión
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Programa de Afiliados
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Centro de Afiliados</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Comparte productos, genera ventas y consulta el rendimiento de tus referencias.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/affiliate/links" className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold shadow-sm hover:bg-muted">
              Enlaces por producto
            </Link>
            <button
              type="button"
              onClick={() => void fetchAffiliateData()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold shadow-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className={loading ? 'animate-spin' : ''}>↻</span> Actualizar datos
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-red-500">{error}</p>
            <button
              type="button"
              onClick={() => void fetchAffiliateData()}
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold hover:bg-muted"
            >
              Reintentar
            </button>
          </div>
        )}

        {loading ? (
          <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-32 animate-pulse rounded-2xl bg-muted" />
            ))}
          </section>
        ) : (
          <section aria-label="Estadísticas de afiliado" className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Referidos" value={String(stats.totalReferrals)} hint="Operaciones atribuidas" />
            <Stat label="Ventas completadas" value={String(stats.completedReferrals)} hint="Referencias convertidas" />
            <Stat label="Ventas generadas" value={formatCurrency(stats.totalSales)} hint="Operaciones completadas" />
            <Stat
              label="Comisión estimada"
              value={formatCurrency(stats.estimatedEarnings)}
              hint={affiliate ? `Tasa ${affiliate.commission_rate.toFixed(2)}%` : 'Sin perfil activo'}
            />
          </section>
        )}

        <section className="rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
          <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-xl">🔗</div>
          <h2 className="text-xl font-black">Tu enlace de afiliado</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Se genera con tu código de afiliado y utiliza siempre el dominio público canónico de Credi Marketplace.
          </p>
          {!affiliate ? (
            <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-600">
              Tu cuenta todavía no tiene un perfil de afiliado activo.
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                readOnly
                value={affiliateLink}
                aria-label="Enlace de afiliado"
                className="min-w-0 flex-1 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground outline-none"
              />
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90"
              >
                {copied ? 'Copiado' : 'Copiar enlace'}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-black text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
