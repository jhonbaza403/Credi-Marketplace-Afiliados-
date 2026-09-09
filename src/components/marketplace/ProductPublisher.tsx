"use client"

import { FormEvent, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import MarketplaceMediaUploader from "@/components/media/MarketplaceMediaUploader"
import type { UploadedMarketplaceMedia } from "@/lib/storage/marketplace-media"
import ProductPublishCopilot, { type ProductSuggestion } from "@/components/marketplace/ProductPublishCopilot"

const CATEGORIES = ["Electrónica", "Moda", "Hogar", "Belleza", "Alimentos", "Educación", "Servicios", "Otros"]

function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "producto"
}

export default function ProductPublisher() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState(CATEGORIES[0])
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("1")
  const [audience, setAudience] = useState("")
  const [media, setMedia] = useState<UploadedMarketplaceMedia[]>([])
  const [publishing, setPublishing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const draft = useMemo(() => ({ title, description, category, price, stock, country: "", audience }), [title, description, category, price, stock, audience])

  function applySuggestion(value: ProductSuggestion) {
    setTitle(value.title)
    setDescription(value.description)
    if (value.category) setCategory(value.category)
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (publishing) return
    setMessage(null)

    const cleanTitle = title.trim()
    const numericPrice = Number(price)
    const numericStock = Number(stock)
    if (cleanTitle.length < 2) return setMessage("El título debe tener al menos 2 caracteres.")
    if (!Number.isFinite(numericPrice) || numericPrice < 0) return setMessage("Introduce un precio válido.")
    if (!Number.isInteger(numericStock) || numericStock < 0) return setMessage("Introduce un stock válido.")
    if (!media.length) return setMessage("Añade al menos una imagen del producto.")

    setPublishing(true)
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error("Debes iniciar sesión para publicar.")

      let { data: store } = await supabase.from("stores").select("id").eq("vendor_id", user.id).maybeSingle()
      if (!store) {
        const slug = `${slugify(cleanTitle)}-${user.id.slice(0, 8)}`
        const { data, error } = await supabase.from("stores").insert({ vendor_id: user.id, store_name: `Tienda de ${user.email?.split("@")[0] || "usuario"}`, slug, description: "Tienda de Credi Marketplace", is_verified: false, is_active: true }).select("id").single()
        if (error || !data) throw error || new Error("No fue posible crear tu tienda.")
        store = data
      }

      const urls = media.filter((item) => item.kind === "image").map((item) => item.url)
      const { error: productError } = await supabase.from("products").insert({
        store_id: store.id,
        title: cleanTitle,
        slug: `${slugify(cleanTitle)}-${crypto.randomUUID().slice(0, 8)}`,
        description: description.trim() || null,
        price: numericPrice,
        stock: numericStock,
        image_url: urls[0] ?? null,
        images: urls,
        is_active: true,
      })
      if (productError) throw productError

      setMessage("Producto publicado correctamente.")
      setTitle(""); setDescription(""); setPrice(""); setStock("1"); setAudience(""); setMedia([])
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible publicar el producto.")
    } finally { setPublishing(false) }
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="mb-8 overflow-hidden rounded-[2rem] border border-cyan-300/10 bg-[radial-gradient(circle_at_15%_15%,rgba(34,211,238,.16),transparent_34%),radial-gradient(circle_at_85%_10%,rgba(168,85,247,.16),transparent_32%),linear-gradient(135deg,#0b1024,#060914)] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_30px_100px_rgba(0,0,0,.3)] sm:p-10">
          <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Credi Publisher Studio</span>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Publica tu producto en minutos.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">Carga imágenes, completa los datos comerciales y usa la IA exclusivamente para convertir tu información en una ficha de producto clara y atractiva. Tú mantienes el control de la publicación.</p>
        </header>

        <form onSubmit={publish} className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/[.035] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_24px_70px_rgba(2,8,28,.28)] sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="sm:col-span-2 text-sm font-bold text-slate-100">Nombre del producto<input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={150} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Ej. Auriculares inalámbricos Pro" /></label>
              <label className="text-sm font-bold text-slate-100">Categoría<select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none">{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-sm font-bold text-slate-100">Público objetivo<input value={audience} onChange={(e) => setAudience(e.target.value)} maxLength={160} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none" placeholder="Ej. tiendas y consumidores" /></label>
              <label className="text-sm font-bold text-slate-100">Precio<input required type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none" /></label>
              <label className="text-sm font-bold text-slate-100">Stock<input required type="number" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none" /></label>
              <label className="sm:col-span-2 text-sm font-bold text-slate-100">Descripción<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={8} maxLength={4000} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none" placeholder="Características, materiales, medidas, usos y cualquier dato comprobable…" /></label>
            </div>

            <div className="mt-7 border-t border-white/10 pt-7">
              <div className="mb-3"><p className="text-sm font-black text-white">Galería del producto</p><p className="mt-1 text-xs text-slate-400">La primera imagen será la portada.</p></div>
              <MarketplaceMediaUploader kind="image" value={media.filter((item) => item.kind === "image")} onChange={setMedia} />
            </div>

            {message && <p role="status" className="mt-6 rounded-2xl border border-cyan-300/15 bg-cyan-300/5 p-4 text-sm text-cyan-100">{message}</p>}

            <button type="submit" disabled={publishing} className="mt-7 w-full rounded-2xl bg-cyan-300 px-6 py-4 text-sm font-black text-slate-950 shadow-[0_14px_35px_rgba(34,211,238,.16)] hover:bg-cyan-200 disabled:opacity-50">{publishing ? "Publicando…" : "Publicar producto"}</button>
          </section>

          <div className="space-y-6">
            <ProductPublishCopilot draft={draft} onApply={applySuggestion} />
            <section className="rounded-[2rem] border border-white/10 bg-white/[.03] p-6 sm:p-7"><p className="text-xs font-black uppercase tracking-[.18em] text-slate-400">Qué revisa el asistente</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{["Título y claridad", "Descripción comercial", "SEO y etiquetas", "Beneficios verificables", "Checklist de publicación", "Notas de cumplimiento"].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-white/[.035] p-4 text-sm font-semibold text-slate-200">✓ {item}</div>)}</div></section>
          </div>
        </form>
      </div>
    </main>
  )
}
