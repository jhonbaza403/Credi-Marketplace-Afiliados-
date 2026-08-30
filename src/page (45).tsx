'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'

// ==========================================================
// TIPOS
// ==========================================================

type B2BOrderStatus =
  | 'pending'
  | 'verifying'
  | 'completed'
  | 'cancelled'

interface B2BOrder {
  id: string
  product_title: string
  quantity: number
  unit_price_usd: number
  total_usd: number
  payment_method: string
  binance_tx_id: string | null
  status: B2BOrderStatus
  created_at: string
}

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getStatusLabel(status: B2BOrderStatus) {
  switch (status) {
    case 'pending':
      return 'Pendiente'
    case 'verifying':
      return 'Verificando pago'
    case 'completed':
      return 'Completada'
    case 'cancelled':
      return 'Cancelada'
    default:
      return status
  }
}

function getStatusClasses(status: B2BOrderStatus) {
  switch (status) {
    case 'completed':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'

    case 'verifying':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-500'

    case 'pending':
      return 'border-sky-500/20 bg-sky-500/10 text-sky-500'

    case 'cancelled':
      return 'border-red-500/20 bg-red-500/10 text-red-500'

    default:
      return 'border-border bg-muted text-muted-foreground'
  }
}

// ==========================================================
// COMPONENTE
// ==========================================================

export default function SupplierB2BOrdersPage() {
  const { user, profile, loading: authLoading } = useAuth()

  const [orders, setOrders] = useState<B2BOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  // ========================================================
  // CARGAR ÓRDENES
  // ========================================================

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setOrders([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: ordersError } = await supabase
        .from('b2b_orders')
        .select(
          `
            id,
            product_title,
            quantity,
            unit_price_usd,
            total_usd,
            payment_method,
            binance_tx_id,
            status,
            created_at
          `
        )
        .eq('supplier_id', user.id)
        .order('created_at', { ascending: false })

      if (ordersError) {
        throw ordersError
      }

      setOrders((data ?? []) as B2BOrder[])
    } catch (err: unknown) {
      console.error(
        '[SupplierB2BOrdersPage] Error cargando órdenes:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible cargar las órdenes mayoristas.'
      )

      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [supabase, user])

  // ========================================================
  // EFECTO
  // ========================================================

  useEffect(() => {
    if (!authLoading) {
      void fetchOrders()
    }
  }, [authLoading, fetchOrders])

  // ========================================================
  // ACTUALIZAR ESTADO
  // ========================================================

  const updateOrderStatus = async (
    orderId: string,
    newStatus: 'completed' | 'cancelled'
  ) => {
    if (!user) {
      return
    }

    const confirmation =
      newStatus === 'completed'
        ? '¿Confirmas que deseas aprobar esta orden y marcarla como completada?'
        : '¿Confirmas que deseas rechazar y cancelar esta orden?'

    if (!window.confirm(confirmation)) {
      return
    }

    setUpdatingOrderId(orderId)
    setError(null)

    try {
      /*
       * La condición supplier_id = user.id es importante:
       * evita actualizar una orden que no pertenece al
       * proveedor autenticado.
       *
       * La protección definitiva debe existir igualmente
       * mediante RLS en Supabase.
       */
      const { error: updateError } = await supabase
        .from('b2b_orders')
        .update({
          status: newStatus,
        })
        .eq('id', orderId)
        .eq('supplier_id', user.id)

      if (updateError) {
        throw updateError
      }

      await fetchOrders()
    } catch (err: unknown) {
      console.error(
        '[SupplierB2BOrdersPage] Error actualizando orden:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible actualizar la orden.'
      )
    } finally {
      setUpdatingOrderId(null)
    }
  }

  // ========================================================
  // ESTADÍSTICAS
  // ========================================================

  const statistics = useMemo(() => {
    const total = orders.length

    const pending = orders.filter(
      (order) =>
        order.status === 'pending' ||
        order.status === 'verifying'
    ).length

    const completed = orders.filter(
      (order) => order.status === 'completed'
    ).length

    const cancelled = orders.filter(
      (order) => order.status === 'cancelled'
    ).length

    const completedRevenue = orders
      .filter((order) => order.status === 'completed')
      .reduce(
        (totalValue, order) =>
          totalValue + Number(order.total_usd || 0),
        0
      )

    return {
      total,
      pending,
      completed,
      cancelled,
      completedRevenue,
    }
  }, [orders])

  // ========================================================
  // ESTADO DE AUTENTICACIÓN
  // ========================================================

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
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
  // SIN SESIÓN
  // ========================================================

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
            🔐
          </div>

          <h1 className="mt-5 text-2xl font-black text-foreground">
            Acceso restringido
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Debes iniciar sesión para administrar tus órdenes
            mayoristas.
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
  // VALIDACIÓN DE ROL
  // ========================================================

  const allowedRoles = [
    'vendor',
    'company',
    'admin',
  ]

  if (
    !profile ||
    !allowedRoles.includes(profile.role)
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-2xl">
            ⛔
          </div>

          <h1 className="mt-5 text-2xl font-black text-foreground">
            Acceso no autorizado
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Tu cuenta no tiene permisos para administrar
            órdenes B2B de proveedor.
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
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-500">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Operaciones B2B
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Órdenes mayoristas
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Supervisa, verifica y administra las órdenes
                recibidas de compradores mayoristas desde un
                único centro de operaciones.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void fetchOrders()}
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
              Actualizar
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
                No se pudo completar la operación
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void fetchOrders()}
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-foreground hover:bg-muted"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* ==================================================
            KPIs
        ================================================== */}

        <section
          aria-label="Resumen de órdenes"
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Órdenes totales
            </p>
            <p className="mt-2 text-3xl font-black">
              {statistics.total}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-500">
              Pendientes / verificación
            </p>
            <p className="mt-2 text-3xl font-black text-amber-500">
              {statistics.pending}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
              Completadas
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-500">
              {statistics.completed}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Volumen completado
            </p>
            <p className="mt-2 text-2xl font-black text-foreground">
              {formatCurrency(
                statistics.completedRevenue
              )}
            </p>
          </div>
        </section>

        {/* ==================================================
            CONTENEDOR PRINCIPAL
        ================================================== */}

        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl">

          <div className="flex flex-col gap-2 border-b border-border px-5 py-5 sm:px-6">
            <h2 className="text-lg font-black">
              Órdenes recibidas
            </h2>

            <p className="text-xs text-muted-foreground">
              Las operaciones están ordenadas de la más
              reciente a la más antigua.
            </p>
          </div>

          {/* =================================================
              EMPTY STATE
          ================================================= */}

          {orders.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-2xl">
                📦
              </div>

              <h3 className="mt-5 text-lg font-black">
                Aún no tienes órdenes B2B
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Las órdenes mayoristas recibidas aparecerán
                aquí automáticamente cuando un comprador
                complete una operación.
              </p>
            </div>
          ) : (
            <>
              {/* =================================================
                  DESKTOP TABLE
              ================================================= */}

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      <th className="px-6 py-4">
                        Producto / lote
                      </th>
                      <th className="px-4 py-4">
                        Cantidad
                      </th>
                      <th className="px-4 py-4">
                        Precio unitario
                      </th>
                      <th className="px-4 py-4">
                        Total
                      </th>
                      <th className="px-4 py-4">
                        Pago
                      </th>
                      <th className="px-4 py-4">
                        Estado
                      </th>
                      <th className="px-6 py-4 text-right">
                        Acción
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="group transition hover:bg-muted/20"
                      >
                        <td className="max-w-xs px-6 py-5">
                          <p className="truncate text-sm font-bold text-foreground">
                            {order.product_title}
                          </p>

                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {formatDate(order.created_at)}
                          </p>
                        </td>

                        <td className="px-4 py-5 text-sm font-semibold">
                          {order.quantity}
                        </td>

                        <td className="px-4 py-5 text-sm text-muted-foreground">
                          {formatCurrency(
                            Number(order.unit_price_usd)
                          )}
                        </td>

                        <td className="px-4 py-5">
                          <span className="text-sm font-black text-amber-500">
                            {formatCurrency(
                              Number(order.total_usd)
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-5">
                          <p className="text-[10px] font-black uppercase text-muted-foreground">
                            {order.payment_method || 'N/D'}
                          </p>

                          {order.binance_tx_id ? (
                            <p
                              title={order.binance_tx_id}
                              className="mt-1 max-w-[160px] truncate rounded-md bg-muted px-2 py-1 font-mono text-[10px]"
                            >
                              {order.binance_tx_id}
                            </p>
                          ) : (
                            <span className="mt-1 block text-[10px] text-muted-foreground">
                              Sin TX ID
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-5">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusClasses(
                              order.status
                            )}`}
                          >
                            {getStatusLabel(
                              order.status
                            )}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-right">
                          {order.status ===
                            'verifying' ? (
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                disabled={
                                  updatingOrderId ===
                                  order.id
                                }
                                onClick={() =>
                                  void updateOrderStatus(
                                    order.id,
                                    'completed'
                                  )
                                }
                                className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {updatingOrderId ===
                                order.id
                                  ? 'Procesando...'
                                  : 'Aprobar'}
                              </button>

                              <button
                                type="button"
                                disabled={
                                  updatingOrderId ===
                                  order.id
                                }
                                onClick={() =>
                                  void updateOrderStatus(
                                    order.id,
                                    'cancelled'
                                  )
                                }
                                className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-black text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Rechazar
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold text-muted-foreground">
                              Sin acciones
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* =================================================
                  MOBILE CARDS
              ================================================= */}

              <div className="divide-y divide-border lg:hidden">
                {orders.map((order) => (
                  <article
                    key={order.id}
                    className="p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black">
                          {order.product_title}
                        </h3>

                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {formatDate(order.created_at)}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${getStatusClasses(
                          order.status
                        )}`}
                      >
                        {getStatusLabel(
                          order.status
                        )}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-muted/40 p-3">
                        <p className="text-[9px] font-bold uppercase text-muted-foreground">
                          Cantidad
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {order.quantity}
                        </p>
                      </div>

                      <div className="rounded-xl bg-muted/40 p-3">
                        <p className="text-[9px] font-bold uppercase text-muted-foreground">
                          Total
                        </p>
                        <p className="mt-1 text-sm font-black text-amber-500">
                          {formatCurrency(
                            Number(order.total_usd)
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-border p-3">
                      <p className="text-[9px] font-bold uppercase text-muted-foreground">
                        Pago
                      </p>

                      <p className="mt-1 text-xs font-bold uppercase">
                        {order.payment_method || 'N/D'}
                      </p>

                      {order.binance_tx_id && (
                        <p className="mt-2 break-all rounded-md bg-muted p-2 font-mono text-[9px] text-muted-foreground">
                          {order.binance_tx_id}
                        </p>
                      )}
                    </div>

                    {order.status === 'verifying' && (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={
                            updatingOrderId ===
                            order.id
                          }
                          onClick={() =>
                            void updateOrderStatus(
                              order.id,
                              'completed'
                            )
                          }
                          className="rounded-xl bg-emerald-500 px-3 py-3 text-xs font-black text-white transition hover:bg-emerald-600 disabled:opacity-50"
                        >
                          {updatingOrderId ===
                          order.id
                            ? 'Procesando...'
                            : 'Aprobar orden'}
                        </button>

                        <button
                          type="button"
                          disabled={
                            updatingOrderId ===
                            order.id
                          }
                          onClick={() =>
                            void updateOrderStatus(
                              order.id,
                              'cancelled'
                            )
                          }
                          className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-3 text-xs font-black text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ==================================================
            AVISO DE SEGURIDAD
        ================================================== */}

        <div className="mt-6 rounded-2xl border border-border bg-card/50 p-4">
          <p className="text-[10px] leading-5 text-muted-foreground">
            <strong className="text-foreground">
              Seguridad:
            </strong>{' '}
            las operaciones de proveedor deben estar
            protegidas mediante políticas RLS en Supabase.
            La interfaz cliente no debe considerarse un
            mecanismo de autorización.
          </p>
        </div>
      </div>
    </main>
  )
}
