"use client"

import { FormEvent, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { BriefcaseBusiness, CheckCircle2, ImagePlus, Package, Sparkles, Video } from "lucide-react"
import MarketplaceMediaUploader from "@/components/media/MarketplaceMediaUploader"
import type { UploadedMarketplaceMedia } from "@/lib/storage/marketplace-media"
import ProductPublishCopilot, { type ProductSuggestion } from "@/components/marketplace/ProductPublishCopilot"
import { createClient } from "@/lib/supabase/client"

const CATEGORIES = ["Electrónica", "Moda", "Hogar", "Belleza", "Alimentos", "Educación", "Servicios", "Salud y bienestar", "Automoción", "Construcción", "Profesionales", "Otros"]
const MAX_DESCRIPTION = 12000

type OfferingType = "product" | "service"

function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "oferta"
}

export default function ProductPublisher() {
  const router = useRouter()
  const [offeringType, setOfferingType] = useState<OfferingType>("product")
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
  const images = media.filter((item) => item.kind === "image")
  const videos = media.filter((item) => item.kind === "video")

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
    const cleanDescription = description.trim()
    const numericPrice = Number(price)
    const numericStock = Number(stock)

    if (cleanTitle.length < 2) return setMessage("El nombre debe tener al menos 2 caracteres.")
    if (cleanDescription.length < 20) return setMessage("Añade una descripción comercial de al menos 20 caracteres.")
    if (!Number.isFinite(numericPrice) || numericPrice < 0) return setMessage("Introduce un precio válido.")
    if (!Number.isInteger(numericStock) || numericStock < 0) return setMessage(offeringType === "service" ? "Introduce una capacidad o disponibilidad válida." : "Introduce un stock válido.")
    if (!images.length) return setMessage("Añade al menos una imagen para identificar la oferta.")
    if (videos.length > 1) return setMessage("Puedes asociar como máximo un vídeo principal.")

    setPublishing(true)
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error("Debes iniciar sesión para registrar la oferta.")

      let { data: store } = await supabase.from("stores").select("id").eq("vendor_id", user.id).maybeSingle()
      if (!store) {
        const slug = `${slugify(cleanTitle)}-${user.id.slice(0, 8)}`
        const { data, error } = await supabase.from("stores").insert({
          vendor_id: user.id,
          store_name: `Tienda de ${user.email?.split("@")[0] || "usuario"}`,
          slug,
          description: "Empresa en Credi Marketplace",
          is_verified: false,
          is_active: true,
        }).select("id").single()
        if (error || !data) throw error || new Error("No fue posible crear tu tienda.")
        store = data
      }

      const imageUrls = images.map((item) => item.url)
      const videoMedia = videos.map((item) => ({ url: item.url, path: item.path, name: item.name, size: item.size, contentType: item.contentType }))
      const { data: createdProduct, error: productError } = await supabase.from("products").insert({
        store_id: store.id,
        offering_type: offeringType,
        title: cleanTitle,
        slug: `${slugify(cleanTitle)}-${crypto.randomUUID().slice(0, 8)}`,
        description: cleanDescription,
        price: numericPrice,
        stock: numericStock,
        image_url: imageUrls[0] ?? null,
        images: imageUrls,
        video_media: videoMedia,
        is_active: true,
      }).select("id").single()

      if (productError || !createdProduct) throw productError || new Error("No fue posible crear la oferta.")

      const { error: controlError } = await supabase.from("product_publication_controls").insert({
        product_id: createdProduct.id,
        owner_id: user.id,
        catalog_visible: false,
        marketplace_visible: false,
        b2b_visible: false,
        feed_visible: false,
        story_visible: false,
        sale_enabled: false,
      })
      if (controlError) throw controlError

      const { error: inventoryError } = await supabase.from("inventory").upsert({ product_id: createdProduct.id, available_quantity: numericStock }, { onConflict: "product_id" })
      if (inventoryError) throw inventoryError

      setMessage(`${offeringType === "service" ? "Servicio" : "Bien"} registrado correctamente en tu inventario privado.`)
      setTitle("")
      setDescription("")
      setPrice("")
      setStock("1")
      setAudience("")
      setMedia([])
      router.push("/gestion-empresarial")
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible registrar la oferta.")
    } finally {
      setPublishing(false)
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030712] text-white">
      <div className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="relative isolate overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[#071225] px-5 py-7 shadow-[0_30px_100px_rgba(0,0,0,.45)] sm:px-8 sm:py-9 lg:px-10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_8%,rgba(34,211,238,.18),transparent_28%),radial-gradient(circle_at_84%_18%,rgba(168,85,247,.18),transparent_30%),linear-gradient(135deg,#071225_0%,#081a2d_46%,#050914_100%)]" />
          <div className="absolute right-[-90px] top-[-100px] -z-10 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="relative z-10 max-w-5xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.22em] text-cyan-100"><Sparkles className="size-3.5" /> Credi Publisher Studio</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-slate-200">Multiformato · B2C · B2B</span>
            </div>
            <h1 className="mt-5 max-w-4xl text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">Registra bienes y servicios en tu empresa.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">Crea una ficha comercial completa con imágenes y vídeo. La oferta se guarda primero en privado y después puedes decidir en qué canales publicarla.</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[.055] p-3.5"><p className="text-xs font-bold text-white">Contenido visual</p><p className="mt-1 text-[11px] text-slate-300">Galería de imágenes + vídeo principal.</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[.055] p-3.5"><p className="text-xs font-bold text-white">Publicación inteligente</p><p className="mt-1 text-[11px] text-slate-300">Marketplace, catálogo, B2B, feed e historias.</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[.055] p-3.5"><p className="text-xs font-bold text-white">Inventario privado</p><p className="mt-1 text-[11px] text-slate-300">Nada se hace público hasta que lo decidas.</p></div>
            </div>
          </div>
        </header>

        <form onSubmit={publish} className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <section className="rounded-[2rem] border border-white/10 bg-[#08111f] p-5 shadow-[0_24px_80px_rgba(0,0,0,.24)] sm:p-7 lg:p-8">
            <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[.025] p-2">
              <button type="button" onClick={() => setOfferingType("product")} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition ${offeringType === "product" ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/5"}`}><Package className="size-4" /> Bien</button>
              <button type="button" onClick={() => setOfferingType("service")} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition ${offeringType === "service" ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/5"}`}><BriefcaseBusiness className="size-4" /> Servicio</button>
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <label className="sm:col-span-2 text-sm font-bold text-slate-100">Nombre comercial<input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={300} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#050b16] px-4 py-3.5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/55 focus:ring-2 focus:ring-cyan-300/10" placeholder={offeringType === "service" ? "Ej. Consultoría empresarial especializada" : "Ej. Auriculares inalámbricos Pro"} /></label>
              <label className="text-sm font-bold text-slate-100">Categoría<select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#050b16] px-4 py-3.5 text-white outline-none focus:border-cyan-300/55">{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-sm font-bold text-slate-100">Público objetivo<input value={audience} onChange={(e) => setAudience(e.target.value)} maxLength={160} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#050b16] px-4 py-3.5 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/55" placeholder="Consumidores, empresas, profesionales…" /></label>
              <label className="text-sm font-bold text-slate-100">Precio<input required type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#050b16] px-4 py-3.5 text-white outline-none focus:border-cyan-300/55" placeholder="0.00" /></label>
              <label className="text-sm font-bold text-slate-100">{offeringType === "service" ? "Capacidad / disponibilidad" : "Stock disponible"}<input required type="number" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#050b16] px-4 py-3.5 text-white outline-none focus:border-cyan-300/55" /></label>
              <label className="sm:col-span-2 text-sm font-bold text-slate-100">Descripción comercial<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={8} maxLength={MAX_DESCRIPTION} required className="mt-2 w-full rounded-2xl border border-white/10 bg-[#050b16] px-4 py-3.5 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/55" placeholder={offeringType === "service" ? "Describe el servicio, alcance, entregables, metodología, duración y condiciones…" : "Características, materiales, medidas, usos, compatibilidad y cualquier dato comprobable…"} /><span className="mt-1 block text-right text-[10px] text-slate-500">{description.length.toLocaleString("es-ES")} / {MAX_DESCRIPTION.toLocaleString("es-ES")}</span></label>
            </div>

            <div className="mt-8 border-t border-white/10 pt-8">
              <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-200">01 · Imágenes</p><h2 className="mt-1 text-xl font-black text-white">Galería profesional</h2><p className="mt-1 text-xs text-slate-400">La primera imagen será la portada.</p></div><ImagePlus className="hidden size-6 text-cyan-300 sm:block" /></div>
              <MarketplaceMediaUploader kind="image" maxFiles={8} value={images} onChange={(next) => setMedia([...next, ...videos])} />
            </div>

            <div className="mt-8 border-t border-white/10 pt-8">
              <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-violet-200">02 · Vídeo</p><h2 className="mt-1 text-xl font-black text-white">Vídeo de demostración</h2><p className="mt-1 text-xs text-slate-400">Añade un vídeo principal para mostrar el bien o explicar el servicio.</p></div><Video className="hidden size-6 text-violet-300 sm:block" /></div>
              <MarketplaceMediaUploader kind="video" maxFiles={1} multiple={false} value={videos} onChange={(next) => setMedia([...images, ...next])} />
            </div>

            {message && <div role="status" className="mt-7 flex items-start gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/8 p-4 text-sm text-cyan-100"><CheckCircle2 className="mt-0.5 size-5 shrink-0" /> <span>{message}</span></div>}
            <button type="submit" disabled={publishing} className="mt-7 w-full rounded-2xl bg-cyan-300 px-6 py-4 text-sm font-black text-slate-950 shadow-[0_16px_40px_rgba(34,211,238,.16)] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50">{publishing ? "Guardando oferta…" : `Guardar ${offeringType === "service" ? "servicio" : "bien"} en inventario privado`}</button>
          </section>

          <div className="space-y-6">
            <ProductPublishCopilot draft={draft} onApply={applySuggestion} />
            <section className="rounded-[2rem] border border-white/10 bg-[#08111f] p-6 shadow-[0_24px_80px_rgba(0,0,0,.24)] sm:p-7"><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-200">03 · Distribución</p><h2 className="mt-1 text-xl font-black text-white">Un activo, múltiples canales</h2><p className="mt-2 text-sm leading-6 text-slate-400">La ficha se crea una sola vez. La distribución se controla después desde Gestión Empresarial.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{[["Marketplace","Venta B2C"],["Catálogo","Presentación comercial"],["B2B","Venta mayorista"],["Feed","Contenido"],["Historias","24 horas"],["Venta","Checkout"]].map(([item,desc]) => <div key={item} className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><p className="text-sm font-black text-white">{item}</p><p className="mt-1 text-[11px] text-slate-400">{desc}</p></div>)}</div></section>
          </div>
        </form>
      </div>
    </main>
  )
}
