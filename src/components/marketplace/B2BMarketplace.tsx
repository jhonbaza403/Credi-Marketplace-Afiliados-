"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Building2, Package, ShoppingCart, Users, TrendingUp } from "lucide-react"

type B2BProduct = {
  id: string
  title: string
  category: string
  wholesale_price_usd: number
  regular_price_usd: number
  min_order_quantity: number
  stock_available: number
  image_url: string | null
  video_media: Array<{ url?: string }>
  description: string
  country: string | null
}

const features = [
  { title: "Compras Mayoristas", description: "Acceso a productos empresariales con condiciones comerciales para negocios.", icon: <ShoppingCart size={28} /> },
  { title: "Proveedores Verificados", description: "Conecta empresas con proveedores y distribuidores dentro del ecosistema Credi.", icon: <Building2 size={28} /> },
  { title: "Gestión Empresarial", description: "Administra pedidos, relaciones comerciales y operaciones B2B.", icon: <Package size={28} /> },
  { title: "Red Comercial", description: "Construye relaciones con compradores, vendedores y aliados estratégicos.", icon: <Users size={28} /> },
]

export default function B2BMarketplace() {
  const [products, setProducts] = useState<B2BProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch("/api/b2b/products", { cache: "no-store", signal: controller.signal })
        const data = await response.json() as { products?: B2BProduct[]; error?: string }
        if (!response.ok) throw new Error(data.error || "No fue posible cargar el catálogo B2B.")
        setProducts(data.products ?? [])
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
        setError(err instanceof Error ? err.message : "No fue posible cargar el catálogo B2B.")
      } finally {
        setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [])

  return <section className="w-full rounded-3xl border border-cyan-300/10 bg-[#07101f]/85 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_30px_90px_rgba(2,8,28,.35)] sm:p-8">
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div className="flex items-center gap-3"><TrendingUp className="text-cyan-300" size={34} /><div><h2 className="text-2xl font-black text-white">Credi B2B Marketplace</h2><p className="text-sm text-slate-400">Compra, vende y presenta lotes con contenido multimedia.</p></div></div><Link href="/b2b/publish" className="rounded-xl bg-amber-300 px-4 py-2.5 text-center text-xs font-black text-slate-950">Publicar oferta</Link></div>
    <div className="grid gap-5 md:grid-cols-2">{features.map((feature) => <article key={feature.title} className="rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:-translate-y-0.5 hover:bg-white/[.055]"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200">{feature.icon}</div><h3 className="mb-2 text-lg font-black text-white">{feature.title}</h3><p className="text-sm leading-6 text-slate-400">{feature.description}</p></article>)}</div>
    <div className="mt-10 border-t border-white/10 pt-8"><div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Catálogo activo</p><h3 className="mt-1 text-xl font-black text-white">Ofertas publicadas</h3></div><span className="text-xs text-slate-500">{products.length} ofertas</span></div>
      {loading ? <div className="mt-5 h-40 animate-pulse rounded-2xl bg-white/5" /> : error ? <div className="mt-5 rounded-2xl border border-rose-300/15 bg-rose-300/5 p-4 text-sm text-rose-100">{error}</div> : products.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-7 text-center text-sm text-slate-400">Todavía no hay ofertas B2B publicadas. La primera oferta aparecerá aquí después de su aprobación.</div> : <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{products.map((product) => <article key={product.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]"><div className="aspect-[16/10] overflow-hidden bg-slate-950">{product.image_url ? <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-slate-600">Sin imagen</div>}</div><div className="p-5"><div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider text-cyan-200"><span>{product.category}</span><span>{product.country || "GLOBAL"}</span></div><h4 className="mt-2 line-clamp-2 text-base font-black text-white">{product.title}</h4><p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">{product.description}</p><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-slate-950/80 p-3"><span className="block text-slate-500">Mayorista</span><b className="mt-1 block text-white">${Number(product.wholesale_price_usd).toFixed(2)}</b></div><div className="rounded-xl bg-slate-950/80 p-3"><span className="block text-slate-500">MOQ</span><b className="mt-1 block text-white">{product.min_order_quantity}</b></div></div><div className="mt-3 text-[11px] text-slate-500">Stock disponible: {product.stock_available}</div>{product.video_media?.[0]?.url && <div className="mt-3 text-[11px] font-bold text-amber-200">Vídeo disponible</div>}</div></article>)}</div>}
    </div>
  </section>
}
