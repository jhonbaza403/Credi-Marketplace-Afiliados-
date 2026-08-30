'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

interface Product {
  id: string
  title: string
  price: number
  stock: number
  is_active: boolean
}

interface Store {
  id: string
}

export default function SellerDashboardPage() {
  const {
    user,
    profile,
    loading: authLoading,
    isAdmin,
  } = useAuth()

  const [products, setProducts] = useState<Product[]>([])
  const [store, setStore] = useState<Store | null>(null)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ==========================================================
  // PERMISOS DE ACCESO
  // ==========================================================

  const canAccess =
    Boolean(user) &&
    (profile?.role === 'vendor' || isAdmin)

  // ==========================================================
  // CARGAR DATOS DEL VENDEDOR
  // ==========================================================

  const fetchVendorData = useCallback(async () => {
    if (!user) {
      setFetching(false)
      return
    }

    setFetching(true)
    setError(null)

    try {
      // ------------------------------------------------------
      // Buscar tienda asociada
      // ------------------------------------------------------

      const {
        data: storeData,
        error: storeError,
      } = await supabase
        .from('stores')
        .select('id')
        .eq('vendor_id', user.id)
        .maybeSingle()

      if (storeError) {
        throw storeError
      }

      if (!storeData) {
        setStore(null)
        setProducts([])
        return
      }

      setStore(storeData)

      // ------------------------------------------------------
      // Buscar productos de la tienda
      // ------------------------------------------------------

      const {
        data: productsData,
        error: productsError,
      } = await supabase
        .from('products')
        .select(
          'id, title, price, stock, is_active'
        )
        .eq('store_id', storeData.id)
        .order('created_at', {
          ascending: false,
        })

      if (productsError) {
        throw productsError
      }

      setProducts(
        (productsData as Product[]) || []
      )
    } catch (err: unknown) {
      console.error(
        '[SellerDashboard] Error cargando información:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible cargar la información de tu tienda.'
      )

      setProducts([])
    } finally {
      setFetching(false)
    }
  }, [user])

  // ==========================================================
  // EFECTO
  // ==========================================================

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!canAccess) {
      setFetching(false)
      return
    }

    void fetchVendorData()
  }, [
    authLoading,
    canAccess,
    fetchVendorData,
  ])

  // ==========================================================
  // ESTADÍSTICAS
  // ==========================================================

  const statistics = useMemo(() => {
    const active = products.filter(
      (product) => product.is_active
    ).length

    const inactive = products.filter(
      (product) => !product.is_active
    ).length

    const lowStock = products.filter(
      (product) =>
        product.is_active &&
        product.stock > 0 &&
        product.stock <= 5
    ).length

    const outOfStock = products.filter(
      (product) =>
        product.stock <= 0
    ).length

    const inventoryValue = products.reduce(
      (total, product) =>
        total +
        Number(product.price || 0) *
          Number(product.stock || 0),
      0
    )

    return {
      total: products.length,
      active,
      inactive,
      lowStock,
      outOfStock,
      inventoryValue,
    }
  }, [products])

  // ==========================================================
  // ESTADO DE CARGA
  // ==========================================================

  if (authLoading || fetching) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center px-4">
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary"
              aria-label="Cargando"
            />

            <div>
              <p className="text-sm font-bold text-foreground">
                Preparando tu tienda...
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Estamos cargando inventario y configuración.
              </p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ==========================================================
  // ACCESO NO AUTORIZADO
  // ==========================================================

  if (!user || !canAccess) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center justify-center px-4 py-16">
          <section className="w-full rounded-3xl border border-border bg-card p-8 text-center shadow-xl sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-2xl">
              🔒
            </div>

            <h1 className="mt-6 text-2xl font-black tracking-tight text-foreground">
              Acceso restringido
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Esta sección está destinada a vendedores autorizados
              y administradores de Credi Marketplace.
            </p>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Volver al Dashboard
              </Link>

              <Link
                href="/marketplace"
                className="rounded-xl border border-border bg-background px-6 py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted"
              >
                Ir al Marketplace
              </Link>
            </div>
          </section>
        </div>
      </main>
    )
  }

  // ==========================================================
  // DASHBOARD DEL VENDEDOR
  // ==========================================================

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <section className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent" />

          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                    Centro comercial
                  </span>

                  <span className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {isAdmin ? 'Administrador' : 'Vendedor'}
                  </span>
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                  Panel de vendedor
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Administra tu tienda, inventario y publicaciones
                  comerciales desde un centro de operaciones unificado.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/products/create"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90"
                >
                  + Nuevo producto
                </Link>

                <Link
                  href="/seller/b2b"
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-5 py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted"
                >
                  Ventas B2B
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <div className="mt-6 rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
            <div className="flex gap-3">
              <span className="text-lg">⚠️</span>

              <div>
                <p className="text-sm font-bold text-foreground">
                  No fue posible cargar completamente la tienda.
                </p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            MÉTRICAS
        ==================================================== */}

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

          <MetricCard
            label="Productos"
            value={statistics.total}
            description="Total registrados"
            icon="▰"
          />

          <MetricCard
            label="Activos"
            value={statistics.active}
            description="Publicados"
            icon="✓"
            positive
          />

          <MetricCard
            label="Stock bajo"
            value={statistics.lowStock}
            description="5 unidades o menos"
            icon="!"
            warning
          />

          <MetricCard
            label="Agotados"
            value={statistics.outOfStock}
            description="Sin existencias"
            icon="×"
            danger
          />

          <MetricCard
            label="Inventario"
            value={`$${statistics.inventoryValue.toLocaleString(
              'en-US',
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}`}
            description="Valor estimado"
            icon="$"
          />

        </section>

        {/* ====================================================
            TIENDA
        ==================================================== */}

        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8 lg:col-span-2">

            <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                  Inventario
                </p>

                <h2 className="mt-1 text-xl font-black text-foreground">
                  Tus productos
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Controla disponibilidad y estado de tus publicaciones.
                </p>
              </div>

              {store && (
                <span className="inline-flex w-fit items-center rounded-xl border border-border bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
                  Tienda conectada
                </span>
              )}
            </div>

            {!store ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-xl">
                  🏪
                </div>

                <h3 className="mt-5 text-lg font-black text-foreground">
                  Tu tienda todavía no está configurada
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Necesitas una tienda asociada a tu cuenta para
                  comenzar a administrar productos.
                </p>

                <Link
                  href="/dashboard/profile"
                  className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Revisar configuración
                </Link>
              </div>
            ) : products.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-xl">
                  📦
                </div>

                <h3 className="mt-5 text-lg font-black text-foreground">
                  Tu inventario está vacío
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Publica tu primer producto y comienza a construir
                  tu catálogo comercial.
                </p>

                <Link
                  href="/products/create"
                  className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Crear primer producto
                </Link>
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-2xl border border-border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left">
                    <thead className="bg-muted/60">
                      <tr className="border-b border-border">
                        <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Producto
                        </th>

                        <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Precio
                        </th>

                        <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Stock
                        </th>

                        <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Estado
                        </th>

                        <th className="px-5 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Acción
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-border">
                      {products.map((product) => {
                        const stockStatus =
                          product.stock <= 0
                            ? 'out'
                            : product.stock <= 5
                              ? 'low'
                              : 'available'

                        return (
                          <tr
                            key={product.id}
                            className="transition-colors hover:bg-muted/30"
                          >
                            <td className="px-5 py-4">
                              <p className="max-w-[280px] truncate text-sm font-bold text-foreground">
                                {product.title}
                              </p>

                              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                                {product.id}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span className="text-sm font-black text-foreground">
                                $
                                {Number(
                                  product.price || 0
                                ).toFixed(2)}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <StockBadge
                                stock={product.stock}
                                status={stockStatus}
                              />
                            </td>

                            <td className="px-5 py-4">
                              <StatusBadge
                                active={product.is_active}
                              />
                            </td>

                            <td className="px-5 py-4 text-right">
                              <Link
                                href={`/products/${product.id}`}
                                className="text-xs font-bold text-primary hover:underline"
                              >
                                Ver →
                              </Link>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

          {/* ==================================================
              ACCIONES
          ================================================== */}

          <aside className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Herramientas
            </p>

            <h2 className="mt-1 text-xl font-black text-foreground">
              Acciones comerciales
            </h2>

            <div className="mt-6 space-y-3">

              <ActionLink
                href="/products/create"
                icon="+"
                title="Publicar producto"
                description="Añade un nuevo artículo al catálogo."
              />

              <ActionLink
                href="/seller/b2b"
                icon="◆"
                title="Publicar B2B"
                description="Crea una oferta para compradores mayoristas."
              />

              <ActionLink
                href="/jobs/create"
                icon="◇"
                title="Publicar vacante"
                description="Busca talento para tu empresa."
              />

              <ActionLink
                href="/marketplace"
                icon="↗"
                title="Ver Marketplace"
                description="Consulta cómo ven tus clientes el catálogo."
              />

            </div>
          </aside>

        </section>

        {/* ====================================================
            PIE DEL PANEL
        ==================================================== */}

        <section className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-foreground">
                Mantén tu catálogo actualizado
              </p>

              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                La disponibilidad, precios y estado de tus productos
                deben mantenerse actualizados para ofrecer una mejor
                experiencia al comprador.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="text-sm font-bold text-primary hover:underline"
            >
              Volver al Dashboard →
            </Link>
          </div>
        </section>

      </div>
    </main>
  )
}

// ==========================================================
// MÉTRICA
// ==========================================================

interface MetricCardProps {
  label: string
  value: string | number
  description: string
  icon: string
  positive?: boolean
  warning?: boolean
  danger?: boolean
}

function MetricCard({
  label,
  value,
  description,
  icon,
  positive,
  warning,
  danger,
}: MetricCardProps) {
  const iconClass = positive
    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : warning
      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
      : danger
        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
        : 'bg-primary/10 text-primary'

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>

          <p className="mt-2 text-2xl font-black tracking-tight text-foreground">
            {value}
          </p>

          <p className="mt-1 text-[11px] text-muted-foreground">
            {description}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

// ==========================================================
// STOCK
// ==========================================================

function StockBadge({
  stock,
  status,
}: {
  stock: number
  status: 'out' | 'low' | 'available'
}) {
  if (status === 'out') {
    return (
      <span className="inline-flex rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-600 dark:text-red-400">
        Agotado
      </span>
    )
  }

  if (status === 'low') {
    return (
      <span className="inline-flex rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
        {stock} disponibles
      </span>
    )
  }

  return (
    <span className="text-sm font-semibold text-foreground">
      {stock}
    </span>
  )
}

// ==========================================================
// ESTADO
// ==========================================================

function StatusBadge({
  active,
}: {
  active: boolean
}) {
  return (
    <span
      className={[
        'inline-flex rounded-full px-2.5 py-1 text-xs font-bold',
        active
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-muted text-muted-foreground',
      ].join(' ')}
    >
      {active ? 'Activo' : 'Inactivo'}
    </span>
  )
}

// ==========================================================
// ACCIÓN
// ==========================================================

function ActionLink({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-border bg-background p-4 transition-all hover:-translate-y-0.5 hover:bg-muted/50 hover:shadow-sm"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">
          {title}
        </p>

        <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">
          {description}
        </p>
      </div>

      <span className="text-muted-foreground transition-transform group-hover:translate-x-1">
        →
      </span>
    </Link>
  )
}
