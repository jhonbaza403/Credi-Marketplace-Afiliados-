"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { BadgeCheck, Building2, Package, ShoppingCart, ShieldCheck, TrendingUp, Users, Video } from "lucide-react"

type B2BProduct = { id: string; title: string; category: string; wholesale_price_usd: number; regular_price_usd: number; min_order_quantity: number; stock_available: number; image_url: string | null; video_media: Array<{ url?: string }>; description: string; country: string | null }
type ApiResponse = { products?: B2BProduct[]; capabilities?: { can_buy?: boolean; can_sell?: boolean }; error?: string; message?: string }

const features = [
  { title: "Compras Mayoristas", description: "Descubre proveedores y condiciones comerciales para abastecer tu negocio.", icon: <ShoppingCart size={28} /> },
  { title: "Proveedores Verificados", description: "Consulta ofertas provenientes de operaciones empresariales sometidas a controles Credi.", icon: <Building2 size={28} /> },
  { title: "Gestión Empresarial", description: "Centraliza productos, inventario, catálogos, publicaciones y operaciones.", icon: <Package size={28} /> },
  { title: "Red Comercial", description: "Conecta compradores y proveedores mediante conversaciones con contexto comercial.", icon: <Users size={28} /> },
]

export default function B2BMarketplace() {
  const [products, setProducts] = useState<B2BProduct[]>([])
  const [canBuy, setCanBuy] = useState(false)
  const [canSell, setCanSell] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <section className="w-full overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-[#06101e] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_30px_90px_rgba(2,8,28,.38)] sm:p-8">
      <div className="relative overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#08192c] p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,.16),transparent_28%),radial-gradient(circle_at_90%_10%,rgba(168,85,247,.13),transparent_30%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-cyan-100"><TrendingUp size={14} /> Credi B2B Commerce</span>
              {canBuy && <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-emerald-100"><ShieldCheck size={13} /> Compras habilitadas</span>}
              {canSell && <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-violet-100"><BadgeCheck size={13} /> Venta verificada</span>}
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">Mercado B2B y Mayoristas</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">Compra, vende y presenta ofertas con imágenes, vídeo y condiciones comerciales. Comprar y vender son capacidades distintas para que el acceso sea simple y la publicación empresarial conserve controles de confianza.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/chat" className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2.5 text-center text-xs font-black text-cyan-100">Abrir Credi Chat</Link>
            {canSell ? <Link href="/b2b/publish" className="rounded-xl bg-amber-300 px-4 py-2.5 text-center text-xs font-black text-slate-950">Publicar oferta</Link> : <Link href="/account/verificacion" className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-center text-xs font-black text-white">Prepararme para vender</Link>}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">{features.map((feature) => <article key={feature.title} className="rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:-translate-y-0.5 hover:bg-white/[.055]"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200">{feature.icon}</div><h3 className="mb-2 text-lg font-black text-white">{feature.title}</h3><p className="text-sm leading-6 text-slate-400">{feature.description}</p></article>)}</div>

      <div className="mt-10 border-t border-white/10 pt-8">
        <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Catálogo activo</p><h3 className="mt-1 text-xl font-black text-white">Ofertas publicadas</h3></div><span className="text-xs text-slate-500">{products.length} ofertas</span></div>
        {loading ? <div className="mt-5 h-56 animate-pulse rounded-2xl bg-white/5" /> : error ? <div className="mt-5 rounded-2xl border border-rose-300/15 bg-rose-300/5 p-5 text-sm text-rose-100"><p className="font-black">No se pudo cargar el mercado B2B</p><p className="mt-1 text-rose-100/70">{error}</p></div> : products.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-10 text-center"><p className="text-lg font-black text-white">El mercado está listo para tus primeras ofertas</p><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">Las ofertas aparecen después de pasar los controles de publicación. Mientras tanto puedes comprar al mayor con tu cuenta habilitada.</p></div> : <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{products.map((product) => <article key={product.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]"><div className="relative aspect-[16/10] overflow-hidden bg-slate-950">{product.image_url ? <Image src={product.image_url} alt={product.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-cover" /> : <div className="flex h-full items-center justify-center text-slate-600">Sin imagen</div>}{product.video_media?.[0]?.url && <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full border border-white/15 bg-slate-950/80 px-2.5 py-1 text-[10px] font-black text-white"><Video size={12} /> Vídeo</span>}</div><div className="p-5"><div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider text-cyan-200"><span>{product.category}</span><span>{product.country || "GLOBAL"}</span></div><h4 className="mt-2 line-clamp-2 text-base font-black text-white">{product.title}</h4><p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">{product.description}</p><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-slate-950/80 p-3"><span className="block text-slate-500">Mayorista</span><b className="mt-1 block text-white">${Number(product.wholesale_price_usd).toFixed(2)}</b></div><div className="rounded-xl bg-slate-950/80 p-3"><span className="block text-slate-500">MOQ</span><b className="mt-1 block text-white">{product.min_order_quantity}</b></div></div><div className="mt-3 text-[11px] text-slate-500">Stock disponible: {product.stock_available}</div><Link href={`/chat?b2bProduct=${encodeURIComponent(product.id)}`} className="mt-4 flex w-full items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2.5 text-xs font-black text-cyan-100 hover:bg-cyan-300/15">Contactar al proveedor</Link></div></article>)}</div>}
      </div>
    </section>
  )
}
