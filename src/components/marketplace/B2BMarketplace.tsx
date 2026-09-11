"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { BadgeCheck, Building2, Package, ShoppingCart, ShieldCheck, TrendingUp, Users, Video, Search, ArrowRight, MessageSquareText } from "lucide-react"

type B2BProduct = { id: string; title: string; category: string; wholesale_price_usd: number; regular_price_usd: number; min_order_quantity: number; stock_available: number; image_url: string | null; video_media: Array<{ url?: string }>; description: string; country: string | null }
type ApiResponse = { products?: B2BProduct[]; capabilities?: { can_buy?: boolean; can_sell?: boolean }; error?: string; message?: string }

type Feature = { title: string; description: string; href: string; icon: React.ReactNode; action: string }

const features: Feature[] = [
  { title: "Compras Mayoristas", description: "Consulta ofertas provenientes de operaciones empresariales y descubre condiciones comerciales para abastecer tu negocio.", href: "/compras-mayoristas", icon: <ShoppingCart size={28} />, action: "Explorar abastecimiento" },
  { title: "Proveedores Verificados", description: "Descubre proveedores y ofertas empresariales con señales de identidad, reputación y controles Credi.", href: "/proveedores-verificados", icon: <Building2 size={28} />, action: "Ver proveedores" },
  { title: "Gestión Empresarial", description: "Centraliza productos, inventario, catálogos, publicaciones y operaciones en un solo centro de trabajo.", href: "/gestion-empresarial", icon: <Package size={28} />, action: "Abrir Business OS" },
  { title: "Red Comercial", description: "Conecta compradores y proveedores mediante conversaciones con contexto comercial y seguimiento de oportunidades.", href: "/red-comercial", icon: <Users size={28} />, action: "Conectar empresas" },
]

export default function B2BMarketplace() {
  const [products, setProducts] = useState<B2BProduct[]>([])
  const [canBuy, setCanBuy] = useState(false)
  const [canSell, setCanSell] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch("/api/b2b/products", { cache: "no-store", signal: controller.signal })
        const data = await response.json() as ApiResponse
        if (!response.ok) throw new Error(data.message || "No fue posible cargar el catálogo B2B.")
        setProducts(data.products ?? [])
        setCanBuy(Boolean(data.capabilities?.can_buy))
        setCanSell(Boolean(data.capabilities?.can_sell))
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
        setError(err instanceof Error ? err.message : "No fue posible cargar el catálogo B2B.")
      } finally { setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [])

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return products
    return products.filter((product) => `${product.title} ${product.category} ${product.country ?? ""}`.toLowerCase().includes(normalized))
  }, [products, query])

  return (
    <section className="w-full overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--foreground)] shadow-[0_30px_90px_rgba(2,8,28,.18)] sm:p-8">
      <div className="relative overflow-hidden rounded-[1.7rem] border border-[var(--border)] bg-[var(--surface-secondary)] p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,.12),transparent_28%),radial-gradient(circle_at_90%_10%,rgba(168,85,247,.10),transparent_30%)]" />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-[var(--primary)]"><TrendingUp size={14} /> Credi B2B Commerce</span>
              {canBuy && <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-emerald-700 dark:text-emerald-300"><ShieldCheck size={13} /> Compras habilitadas</span>}
              {canSell && <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-violet-700 dark:text-violet-300"><BadgeCheck size={13} /> Venta verificada</span>}
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Mercado B2B y Mayoristas</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base">Un espacio operativo para abastecer, vender, descubrir proveedores y mover conversaciones comerciales desde la misma plataforma.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/chat" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-center text-xs font-black text-[var(--foreground)]"><MessageSquareText size={15} /> Abrir Credi Chat</Link>
            {canSell ? <Link href="/b2b/publish" className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-center text-xs font-black text-white"><ArrowRight size={15} /> Publicar oferta</Link> : <Link href="/account/verificacion" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-center text-xs font-black text-[var(--foreground)]">Prepararme para vender</Link>}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {features.map((feature) => <Link key={feature.title} href={feature.href} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-secondary)] text-[var(--primary)]">{feature.icon}</div><h3 className="mb-2 text-lg font-black text-[var(--foreground)]">{feature.title}</h3><p className="text-sm leading-6 text-[var(--muted)]">{feature.description}</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-black text-[var(--primary)]">{feature.action} <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></span></Link>)}
      </div>

      <div className="mt-10 border-t border-[var(--border)] pt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[var(--primary)]">Catálogo activo</p><h3 className="mt-1 text-xl font-black text-[var(--foreground)]">Ofertas B2B disponibles</h3><p className="mt-1 text-sm text-[var(--muted)]">Busca por empresa, categoría o mercado y abre el contacto comercial con contexto.</p></div>
          <label className="relative block w-full sm:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ofertas…" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" /></label>
        </div>
        {loading ? <div className="mt-5 h-56 animate-pulse rounded-2xl bg-[var(--surface-secondary)]" /> : error ? <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 text-sm text-rose-700 dark:text-rose-300"><p className="font-black">No se pudo cargar el mercado B2B</p><p className="mt-1 opacity-80">{error}</p></div> : visibleProducts.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] p-10 text-center"><p className="text-lg font-black text-[var(--foreground)]">{query ? "No encontramos ofertas con esa búsqueda" : "El mercado está listo para tus primeras ofertas"}</p><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">{query ? "Prueba otra empresa, categoría o mercado." : "Las ofertas aparecen después de superar los controles de publicación empresarial."}</p></div> : <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleProducts.map((product) => <article key={product.id} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"><div className="relative aspect-[16/10] overflow-hidden bg-[var(--surface-secondary)]">{product.image_url ? <Image src={product.image_url} alt={product.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">Sin imagen</div>}{product.video_media?.[0]?.url && <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/80 px-2.5 py-1 text-[10px] font-black text-white"><Video size={12} /> Vídeo</span>}</div><div className="p-5"><div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider text-[var(--primary)]"><span>{product.category}</span><span>{product.country || "GLOBAL"}</span></div><h4 className="mt-2 line-clamp-2 text-base font-black text-[var(--foreground)]">{product.title}</h4><p className="mt-2 line-clamp-3 text-xs leading-5 text-[var(--muted)]">{product.description}</p><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-[var(--surface-secondary)] p-3"><span className="block text-[var(--muted)]">Mayorista</span><b className="mt-1 block text-[var(--foreground)]">${Number(product.wholesale_price_usd).toFixed(2)}</b></div><div className="rounded-xl bg-[var(--surface-secondary)] p-3"><span className="block text-[var(--muted)]">MOQ</span><b className="mt-1 block text-[var(--foreground)]">{product.min_order_quantity}</b></div></div><div className="mt-3 text-[11px] text-[var(--muted)]">Stock disponible: {product.stock_available}</div><Link href={`/chat?b2bProduct=${encodeURIComponent(product.id)}`} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-black text-white hover:opacity-90"><MessageSquareText size={14} /> Contactar al proveedor</Link></div></article>)}</div>}
      </div>
    </section>
  )
}
