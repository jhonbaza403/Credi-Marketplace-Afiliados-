"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, ShieldCheck, Store, UserRoundCheck, PlayCircle, ShoppingCart } from "lucide-react"

import { useAuth } from "@/i18n/hooks/use-auth"
import { useCart } from "@/i18n/hooks/use-cart"
import { useUser } from "@/i18n/hooks/use-user"

type B2BContext = {
  allowed: boolean
  can_sell: boolean
  active: boolean
  email_confirmed: boolean
  kyc_status: string
  kyb_status: string
  store_verified: boolean
  risk_blocked: boolean
  role: string
  plan_code: string
  next_action: string
}

type B2BProduct = {
  id: string
  supplier_id: string
  title: string
  wholesale_price_usd: number
  min_order_quantity: number
  stock_available: number
  image_url: string | null
  video_media?: Array<{ url?: string }>
}

const statusText: Record<string, string> = {
  not_started: "No iniciada",
  pending: "Pendiente",
  submitted: "Enviada",
  in_review: "En revisión",
  additional_information: "Información adicional requerida",
  approved: "Aprobada",
  rejected: "Rechazada",
  expired: "Vencida",
  suspended: "Suspendida",
}

function StatusRow({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        {ok ? <CheckCircle2 className="size-5 shrink-0 text-emerald-500" /> : <ShieldCheck className="size-5 shrink-0 text-amber-500" />}
        <span className="truncate text-sm font-semibold text-foreground">{label}</span>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${ok ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>
        {value}
      </span>
    </div>
  )
}

export default function B2BMarketplace() {
  const { profile, isAdmin, loading: authLoading } = useAuth()
  const { user, isAuthenticated } = useUser()
  const { addToCart, totalItems } = useCart()
  const [verification, setVerification] = useState<B2BContext | null>(null)
  const [products, setProducts] = useState<B2BProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verificationLoading, setVerificationLoading] = useState(true)

  const loadVerification = useCallback(async () => {
    if (!user?.id) {
      setVerificationLoading(false)
      return
    }
    setVerificationLoading(true)
    try {
      const response = await fetch("/api/b2b/access", { cache: "no-store" })
      const payload = (await response.json()) as B2BContext & { message?: string }
      if (!response.ok) throw new Error(payload.message || "No fue posible consultar el estado B2B.")
      setVerification(payload)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "No fue posible consultar el estado B2B.")
    } finally {
      setVerificationLoading(false)
    }
  }, [user?.id])

  const loadCatalog = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/b2b/products", { cache: "no-store" })
      const payload = (await response.json()) as { products?: B2BProduct[]; message?: string }
      if (!response.ok) throw new Error(payload.message || "No fue posible cargar el catálogo B2B verificado.")
      setProducts(payload.products ?? [])
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "No fue posible cargar el catálogo B2B.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadVerification()
  }, [loadVerification])

  useEffect(() => {
    if (verification?.allowed) void loadCatalog()
  }, [loadCatalog, verification?.allowed])

  const displayName = profile?.fullName ?? profile?.full_name ?? user?.email ?? "Cliente"
  const role = verification?.role ?? profile?.role ?? "customer"
  const isSellerRole = ["vendor", "company", "professional", "admin"].includes(role) || isAdmin
  const b2bAllowed = Boolean(verification?.allowed)
  const canSell = Boolean(verification?.can_sell)

  if (authLoading || verificationLoading) {
    return (
      <section aria-busy="true" className="space-y-4">
        <div className="h-10 w-72 animate-pulse rounded-2xl bg-muted" />
        <div className="h-28 animate-pulse rounded-3xl bg-muted/70" />
        <div className="h-64 animate-pulse rounded-3xl bg-muted/50" />
      </section>
    )
  }

  if (!isAuthenticated) {
    return (
      <section className="overflow-hidden rounded-[2rem] border border-border bg-card p-8 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[.18em] text-primary">Credi Business</p>
        <h1 className="mt-2 text-3xl font-black text-foreground">Mercado B2B</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">Inicia sesión para consultar proveedores, comprar al mayor y utilizar las funciones empresariales disponibles para tu cuenta.</p>
        <Link href="/login?next=/compras-mayoristas" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground">Iniciar sesión</Link>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <header className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-primary"><Store className="size-4" /> Credi Business Space</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-5xl">Hola, {displayName}</h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">Compra al mayor con una experiencia separada de la capacidad para vender. Credi aplica los controles avanzados únicamente cuando una operación requiere mayor nivel de confianza.</p>
          </div>
          <div className="rounded-2xl border border-border bg-muted/50 px-4 py-3 text-sm font-bold text-foreground">Plan: <span className="uppercase">{verification?.plan_code ?? "free"}</span></div>
        </div>
      </header>

      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-primary">Trust & Safety</p>
            <h2 className="mt-1 text-2xl font-black text-foreground">Capacidades de tu cuenta</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">La compra B2B y la venta B2B tienen reglas distintas. Esto evita bloquear compradores y reserva la verificación empresarial para quienes publican ofertas.</p>
          </div>
          <Link href="/account/verificacion" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-black text-foreground hover:bg-muted"><UserRoundCheck className="size-4" /> Centro de verificación</Link>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <StatusRow label="Correo electrónico confirmado" ok={Boolean(verification?.email_confirmed)} value={verification?.email_confirmed ? "Verificado" : "Pendiente"} />
          <StatusRow label="Compra B2B" ok={b2bAllowed} value={b2bAllowed ? "Habilitada" : "No disponible"} />
          {isSellerRole ? <StatusRow label="Identidad (KYC) para vender" ok={verification?.kyc_status === "approved"} value={statusText[verification?.kyc_status ?? "not_started"] ?? "No iniciada"} /> : null}
          {isSellerRole ? <StatusRow label="Empresa (KYB) para vender" ok={verification?.kyb_status === "approved"} value={statusText[verification?.kyb_status ?? "not_started"] ?? "No iniciada"} /> : null}
          {isSellerRole ? <StatusRow label="Tienda verificada para vender" ok={Boolean(verification?.store_verified)} value={verification?.store_verified ? "Verificada" : "Pendiente"} /> : null}
          {isSellerRole ? <StatusRow label="Publicación B2B" ok={canSell} value={canSell ? "Habilitada" : "Requiere verificación"} /> : null}
          <StatusRow label="Control de riesgo" ok={!verification?.risk_blocked} value={verification?.risk_blocked ? "Bloqueado / revisión" : "Sin alertas"} />
        </div>

        {b2bAllowed ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-950">
            <strong>Compra B2B habilitada.</strong> Puedes consultar el catálogo y añadir ofertas al carrito. Para publicar como proveedor se mantienen los controles de KYC, KYB, tienda verificada y riesgo.
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
            <strong>Compra B2B pendiente.</strong> Revisa el correo electrónico, el estado de la cuenta y cualquier control de riesgo señalado por Credi.
            <div className="mt-4"><Link href="/account/verificacion" className="rounded-xl bg-amber-900 px-4 py-2.5 text-xs font-black text-white">Revisar cuenta</Link></div>
          </div>
        )}
      </section>

      {b2bAllowed ? (
        <>
          <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-foreground">Catálogo B2B verificado</h2>
              <p className="text-sm text-muted-foreground">Ofertas publicadas de proveedores que superaron los controles de publicación.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 text-sm font-bold text-foreground"><ShoppingCart className="size-4" /> Carrito: {totalItems}</div>
              <button type="button" onClick={() => void loadCatalog()} disabled={loading} className="rounded-xl border border-border px-3 py-2 text-sm font-bold text-foreground disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Actualizando…" : "Actualizar"}</button>
            </div>
          </header>

          {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

          {loading && products.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">Cargando catálogo verificado…</div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <h3 className="font-bold text-foreground">No hay ofertas B2B verificadas disponibles</h3>
              <p className="mt-2 text-sm text-muted-foreground">Las ofertas aparecen aquí después de cumplir los requisitos de publicación y moderación.</p>
              {canSell ? <Link href="/b2b/publish" className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground">Publicar primera oferta</Link> : null}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => {
                const canAdd = product.stock_available >= product.min_order_quantity && product.stock_available > 0
                const videoUrl = product.video_media?.[0]?.url
                return (
                  <article key={product.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <div className="relative aspect-video overflow-hidden bg-muted">
                      {product.image_url ? <img src={product.image_url} alt={product.title} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sin imagen</div>}
                      <span className="absolute left-3 top-3 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-black text-white">VERIFICADO</span>
                      {videoUrl ? <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-slate-950/80 px-2.5 py-1 text-[10px] font-black text-white"><PlayCircle className="size-3" /> VIDEO</span> : null}
                    </div>
                    <div className="space-y-3 p-5">
                      <div><h3 className="font-black text-foreground">{product.title}</h3><p className="mt-1 text-lg font-black text-foreground">{new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(product.wholesale_price_usd))}</p></div>
                      <p className="text-xs text-muted-foreground">Pedido mínimo: {product.min_order_quantity} · Stock: {Math.max(0, product.stock_available)}</p>
                      {videoUrl ? <video controls preload="metadata" className="w-full rounded-xl border border-border bg-black" src={videoUrl} /> : null}
                      <button type="button" disabled={!canAdd} onClick={() => addToCart({ id: product.id, name: product.title, price: Number(product.wholesale_price_usd), quantity: product.min_order_quantity, image: product.image_url })} className="w-full rounded-xl bg-foreground px-4 py-2.5 text-sm font-black text-background disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground">{canAdd ? "Añadir MOQ al carrito" : "No disponible"}</button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </>
      ) : null}
    </section>
  )
}
