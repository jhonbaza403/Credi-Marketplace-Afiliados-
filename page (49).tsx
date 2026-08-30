'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'

// ==========================================================
// TIPOS
// ==========================================================

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

// ==========================================================
// CONSTANTES
// ==========================================================

const COMMISSION_RATE = 0.1

// ==========================================================
// UTILIDADES
// ==========================================================

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

function isCompletedStatus(status: string | null) {
  return (
    status === 'completed' ||
    status === 'paid' ||
    status === 'delivered'
  )
}

// ==========================================================
// PÁGINA
// ==========================================================

export default function AffiliateDashboardPage() {
  const {
    user,
    profile,
    loading: authLoading,
  } = useAuth()

  const [stats, setStats] = useState<AffiliateStats>({
    totalReferrals: 0,
    completedReferrals: 0,
    pendingReferrals: 0,
    totalSales: 0,
    estimatedEarnings: 0,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')

  // ========================================================
  // CLIENTE SUPABASE
  // ========================================================

  const supabase = useMemo(
    () => createClient(),
    []
  )

  // ========================================================
  // ORIGEN DEL SITIO
  // ========================================================

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  // ========================================================
  // CARGAR DATOS DEL AFILIADO
  // ========================================================

  const fetchAffiliateData = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      /*
       * El afiliado se identifica mediante affiliate_ref.
       *
       * IMPORTANTE:
       * La seguridad definitiva de esta consulta debe
       * estar protegida mediante RLS en Supabase.
       */
      const {
        data,
        error: ordersError,
      } = await supabase
        .from('orders')
        .select('total_amount, status')
        .eq('affiliate_ref', user.id)

      if (ordersError) {
        throw ordersError
      }

      const orders =
        (data ?? []) as AffiliateOrder[]

      const totalReferrals = orders.length

      const completedOrders = orders.filter(
        (order) =>
          isCompletedStatus(order.status)
      )

      const pendingOrders = orders.filter(
        (order) =>
          !isCompletedStatus(order.status) &&
          order.status !== 'cancelled'
      )

      const totalSales = completedOrders.reduce(
        (sum, order) =>
          sum + Number(order.total_amount ?? 0),
        0
      )

      const estimatedEarnings =
        totalSales * COMMISSION_RATE

      setStats({
        totalReferrals,
        completedReferrals:
          completedOrders.length,
        pendingReferrals:
          pendingOrders.length,
        totalSales,
        estimatedEarnings,
      })
    } catch (err: unknown) {
      console.error(
        '[AffiliateDashboard] Error cargando datos:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible cargar la información de afiliado.'
      )

      setStats({
        totalReferrals: 0,
        completedReferrals: 0,
        pendingReferrals: 0,
        totalSales: 0,
        estimatedEarnings: 0,
      })
    } finally {
      setLoading(false)
    }
  }, [supabase, user])

  // ========================================================
  // EFECTO
  // ========================================================

  useEffect(() => {
    if (!authLoading) {
      void fetchAffiliateData()
    }
  }, [authLoading, fetchAffiliateData])

  // ========================================================
  // COPIAR ENLACE
  // ========================================================

  const handleCopy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)

      setCopied(true)

      window.setTimeout(() => {
        setCopied(false)
      }, 2500)
    } catch (error) {
      console.error(
        '[AffiliateDashboard] Error copiando enlace:',
        error
      )

      setError(
        'No fue posible copiar el enlace automáticamente.'
      )
    }
  }

  // ========================================================
  // ENLACE DE AFILIADO
  // ========================================================

  const affiliateLink =
    origin && user
      ? `${origin}/products?ref=${encodeURIComponent(user.id)}`
      : ''

  // ========================================================
  // CARGANDO AUTENTICACIÓN
  // ========================================================

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />

          <p className="text-sm font-medium text-muted-foreground">
            Verificando sesión...
          </p>
        </div>
      </main>
    )
  }

  // ========================================================
  // SIN AUTENTICACIÓN
  // ========================================================

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
            🔐
          </div>

          <h1 className="mt-5 text-2xl font-black text-foreground">
            Acceso restringido
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Debes iniciar sesión para acceder a tu
            panel de afiliado.
          </p>

          <Link
            href="/login"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90"
          >
            Iniciar sesión
          </Link>
        </div>
      </main>
    )
  }

  // ========================================================
  // AUTORIZACIÓN
  // ========================================================

  /*
   * El AuthContext actual no contempla "affiliate"
   * como UserRole.
   *
   * Por ahora, vendor puede acceder al módulo de
   * afiliados. Si posteriormente incorporamos affiliate
   * al modelo UserRole, esta condición puede ampliarse.
   */

  const canAccessAffiliate =
    profile?.role === 'vendor' ||
    profile?.role === 'admin'

  if (!canAccessAffiliate) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-2xl">
            ⛔
          </div>

          <h1 className="mt-5 text-2xl font-black text-foreground">
            Acceso no autorizado
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Tu cuenta no tiene habilitado el módulo de
            afiliados.
          </p>

          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center justify-center rounded-xl border border-border bg-background px-5 py-3 text-sm font-bold text-foreground transition hover:bg-muted"
          >
            Volver al panel
          </Link>
        </div>
      </main>
    )
  }

  // ========================================================
  // CARGANDO DATOS
  // ========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-7xl">

          <div className="animate-pulse space-y-8">
            <div className="h-10 w-72 rounded-xl bg-muted" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-32 rounded-2xl bg-muted"
                />
              ))}
            </div>

            <div className="h-48 rounded-3xl bg-muted" />
          </div>
        </div>
      </main>
    )
  }

  // ========================================================
  // RENDER PRINCIPAL
  // ========================================================

  return (
    <main className="min-h-screen bg-background text-foreground">

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">

        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Programa de Afiliados
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Centro de Afiliados
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Comparte productos, genera ventas y
                consulta el rendimiento de tus referencias
                desde un único panel.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void fetchAffiliateData()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground shadow-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span
                className={
                  loading ? 'animate-spin' : ''
                }
              >
                ↻
              </span>
              Actualizar datos
            </button>
          </div>
        </header>

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-sm font-bold text-red-500">
                No fue posible cargar los datos
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void fetchAffiliateData()}
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-foreground transition hover:bg-muted"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* ==================================================
            ESTADÍSTICAS
        ================================================== */}

        <section
          aria-label="Estadísticas de afiliado"
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Referidos
            </p>

            <p className="mt-2 text-3xl font-black text-foreground">
              {stats.totalReferrals}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Operaciones atribuidas
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-500">
              Ventas completadas
            </p>

            <p className="mt-2 text-3xl font-black text-emerald-500">
              {stats.completedReferrals}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Referencias convertidas
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500">
              Ventas generadas
            </p>

            <p className="mt-2 text-2xl font-black text-amber-500">
              {formatCurrency(stats.totalSales)}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Solo operaciones completadas
            </p>
          </div>

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-500">
              Comisión estimada
            </p>

            <p className="mt-2 text-2xl font-black text-blue-500">
              {formatCurrency(
                stats.estimatedEarnings
              )}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Tasa estimada: {COMMISSION_RATE * 100}%
            </p>
          </div>
        </section>

        {/* ==================================================
            ENLACE DE AFILIADO
        ================================================== */}

        <section className="rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

            <div className="max-w-2xl">

              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-xl">
                🔗
              </div>

              <h2 className="text-xl font-black">
                Tu enlace de afiliado
              </h2>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Comparte este enlace para dirigir a tus
                clientes al catálogo. Las compras atribuidas
                al enlace podrán asociarse a tu cuenta de
                afiliado.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-left lg:min-w-[180px]">
              <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                Identificador
              </p>

              <p
                title={user.id}
                className="mt-1 truncate font-mono text-xs text-foreground"
              >
                {user.id}
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">

            <input
              type="text"
              readOnly
              value={
                affiliateLink ||
                'Generando enlace...'
              }
              aria-label="Enlace personal de afiliado"
              className="min-w-0 flex-1 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
            />

            <button
              type="button"
              disabled={!affiliateLink}
              onClick={() =>
                void handleCopy(affiliateLink)
              }
              className="shrink-0 rounded-xl bg-primary px-6 py-3 text-sm font-black text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied
                ? '✓ Enlace copiado'
                : 'Copiar enlace'}
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-2 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Utiliza siempre este enlace para que las
              referencias puedan atribuirse correctamente.
            </p>

            <Link
              href="/products"
              className="text-xs font-black text-primary hover:underline"
            >
              Explorar productos →
            </Link>
          </div>
        </section>

        {/* ==================================================
            INFORMACIÓN DE COMISIONES
        ================================================== */}

        <section className="mt-6 rounded-2xl border border-border bg-card/50 p-5">
          <div className="flex gap-3">
            <div className="shrink-0 text-lg">
              ℹ️
            </div>

            <div>
              <h3 className="text-sm font-black">
                Sobre tus comisiones
              </h3>

              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                La comisión mostrada actualmente es una
                estimación calculada sobre las ventas
                completadas utilizando una tasa del{' '}
                <strong className="text-foreground">
                  {COMMISSION_RATE * 100}%
                </strong>
                . La liquidación definitiva debe calcularse
                mediante la lógica financiera del servidor y
                las reglas configuradas en la plataforma.
              </p>
            </div>
          </div>
        </section>

      </div>
    </main>
  )
}
