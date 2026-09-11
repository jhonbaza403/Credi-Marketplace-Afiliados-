"use client"

import { FormEvent, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { BriefcaseBusiness, CheckCircle2, ImagePlus, Package, Sparkles, Video, ShoppingBag, Users, Newspaper, BookOpen, PlaySquare, BadgeDollarSign } from "lucide-react"
import MarketplaceMediaUploader from "@/components/media/MarketplaceMediaUploader"
import type { UploadedMarketplaceMedia } from "@/lib/storage/marketplace-media"
import ProductPublishCopilot, { type ProductSuggestion } from "@/components/marketplace/ProductPublishCopilot"
import { createClient } from "@/lib/supabase/client"

const CATEGORIES = ["Electrónica", "Moda", "Hogar", "Belleza", "Alimentos", "Educación", "Servicios", "Salud y bienestar", "Automoción", "Construcción", "Profesionales", "Otros"]
const MAX_DESCRIPTION = 12000

type OfferingType = "product" | "service"
type Channel = "marketplace" | "catalog" | "b2b" | "feed" | "story" | "sale"

const CHANNELS: Array<{ key: Channel; label: string; description: string; icon: typeof ShoppingBag }> = [
  { key: "marketplace", label: "Marketplace", description: "Venta B2C", icon: ShoppingBag },
  { key: "catalog", label: "Catálogo", description: "Presentación comercial", icon: BookOpen },
  { key: "b2b", label: "B2B", description: "Mayoristas y empresas", icon: Users },
  { key: "feed", label: "Feed", description: "Contenido comercial", icon: Newspaper },
  { key: "story", label: "Historias", description: "Promoción temporal", icon: PlaySquare },
  { key: "sale", label: "Venta", description: "Habilitar checkout", icon: BadgeDollarSign },
]

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
  const [channels, setChannels] = useState<Record<Channel, boolean>>({ marketplace: true, catalog: true, b2b: true, feed: false, story: false, sale: true })
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

  function toggleChannel(key: Channel) {
    setChannels((current) => ({ ...current, [key]: !current[key] }))
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
    if (!Object.values(channels).some(Boolean)) return setMessage("Activa al menos un canal comercial.")

    setPublishing(true)
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error("Debes iniciar sesión para registrar la oferta.")

      let { data: store } = await supabase.from("stores").select("id").eq("vendor_id", user.id).maybeSingle()
      if (!store) {
        const slug = `${slugify(cleanTitle)}-${user.id.slice(0, 8)}`
        const { data, error } = await supabase.from("stores").insert({ vendor_id: user.id, store_name: `Tienda de ${user.email?.split("@")[0] || "usuario"}`, slug, description: "Empresa en Credi Marketplace", is_verified: false, is_active: true }).select("id").single()
        if (error || !data) throw error || new Error("No fue posible crear tu tienda.")
        store = data
      }

      const imageUrls = images.map((item) => item.url)
      const videoMedia = videos.map((item) => ({ url: item.url, path: item.path, name: item.name, size: item.size, contentType: item.contentType }))
      const { data: createdProduct, error: productError } = await supabase.from("products").insert({ store_id: store.id, offering_type: offeringType, title: cleanTitle, slug: `${slugify(cleanTitle)}-${crypto.randomUUID().slice(0, 8)}`, description: cleanDescription, price: numericPrice, stock: numericStock, image_url: imageUrls[0] ?? null, images: imageUrls, video_media: videoMedia, is_active: true }).select("id").single()
      if (productError || !createdProduct) throw productError || new Error("No fue posible crear la oferta.")

      const { error: controlError } = await supabase.from("product_publication_controls").insert({ product_id: createdProduct.id, owner_id: user.id, catalog_visible: channels.catalog, marketplace_visible: channels.marketplace, b2b_visible: channels.b2b, feed_visible: channels.feed, story_visible: channels.story, sale_enabled: channels.sale })
      if (controlError) throw controlError

      const { error: inventoryError } = await supabase.from("inventory").upsert({ product_id: createdProduct.id, available_quantity: numericStock }, { onConflict: "product_id" })
      if (inventoryError) throw inventoryError

      setMessage(`${offeringType === "service" ? "Servicio" : "Bien"} registrado correctamente. Canales: ${Object.entries(channels).filter(([, enabled]) => enabled).map(([key]) => CHANNELS.find((item) => item.key === key)?.label).filter(Boolean).join(", ")}.`)
      setTitle("")
      setDescription("")
      setPrice("")
      setStock("1")
      setAudience("")
      setMedia([])
      router.push("/inventario")
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible registrar la oferta.")
    } finally {
      setPublishing(false)
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="relative z-10 mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="marketplace-card relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] px-5 py-7 shadow-xl sm:px-8 sm:py-9 lg:px-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(34,211,238,.10),transparent_28%),radial-gradient(circle_at_84%_18%,rgba(168,85,247,.08),transparent_30%)]" />
          <div className="relative z-10 max-w-5xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.22em] text-[var(--primary)]"><Sparkles className="size-3.5" /> Credi Publisher Studio</span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-[var(--foreground)]">Multiformato · B2C · B2B</span>
            </div>
            <h1 className="mt-5 max-w-4xl text-3xl font-black leading-[1.05] tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">Crea una oferta comercial y llévala de la idea al mercado.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base">Un solo activo comercial para imagen, vídeo, B2C, B2B, catálogo, contenido y venta. Decide desde aquí dónde aparece y cómo se activa.</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3.5"><p className="text-xs font-bold text-[var(--foreground)]">Contenido multiformato</p><p className="mt-1 text-[11px] text-[var(--muted)]">Galería profesional + vídeo principal.</p></div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3.5"><p className="text-xs font-bold text-[var(--foreground)]">Comercio conectado</p><p className="mt-1 text-[11px] text-[var(--muted)]">Canales B2C y operaciones B2B desde una misma ficha.</p></div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3.5"><p className="text-xs font-bold text-[var(--foreground)]">Inventario operativo</p><p className="mt-1 text-[11px] text-[var(--muted)]">La oferta queda registrada y lista para gestionar.</p></div>
            </div>
          </div>
        </header>

        <form onSubmit={publish} className="relative z-10 mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <section className="marketplace-card rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl sm:p-7 lg:p-8">
            <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-2">
              <button type="button" onClick={() => setOfferingType("product")} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition ${offeringType === "product" ? "bg-[var(--primary)] text-white" : "text-[var(--foreground)] hover:bg-[var(--surface-tertiary)]"}`}><Package className="size-4" /> Bien</button>
              <button type="button" onClick={() => setOfferingType("service")} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition ${offeringType === "service" ? "bg-[var(--primary)] text-white" : "text-[var(--foreground)] hover:bg-[var(--surface-tertiary)]"}`}><BriefcaseBusiness className="size-4" /> Servicio</button>
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <label className="sm:col-span-2 text-sm font-bold text-[var(--foreground)]">Nombre comercial<input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={300} className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" placeholder={offeringType === "service" ? "Ej. Consultoría empresarial especializada" : "Ej. Auriculares inalámbricos Pro"} /></label>
              <label className="text-sm font-bold text-[var(--foreground)]">Categoría<select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-[var(--foreground)] outline-none focus:border-[var(--primary)]">{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-sm font-bold text-[var(--foreground)]">Público objetivo<input value={audience} onChange={(e) => setAudience(e.target.value)} maxLength={160} className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]" placeholder="Consumidores, empresas, profesionales…" /></label>
              <label className="text-sm font-bold text-[var(--foreground)]">Precio<input required type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-[var(--foreground)] outline-none focus:border-[var(--primary)]" placeholder="0.00" /></label>
              <label className="text-sm font-bold text-[var(--foreground)]">{offeringType === "service" ? "Capacidad / disponibilidad" : "Stock disponible"}<input required type="number" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-[var(--foreground)] outline-none focus:border-[var(--primary)]" /></label>
              <label className="sm:col-span-2 text-sm font-bold text-[var(--foreground)]">Descripción comercial<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={8} maxLength={MAX_DESCRIPTION} required className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]" placeholder={offeringType === "service" ? "Describe el servicio, alcance, entregables, metodología, duración y condiciones…" : "Características, materiales, medidas, usos, compatibilidad y cualquier dato comprobable…"} /><span className="mt-1 block text-right text-[10px] text-[var(--muted)]">{description.length.toLocaleString("es-ES")} / {MAX_DESCRIPTION.toLocaleString("es-ES")}</span></label>
            </div>

            <div className="mt-8 border-t border-[var(--border)] pt-8">
              <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[var(--primary)]">01 · Imágenes</p><h2 className="mt-1 text-xl font-black text-[var(--foreground)]">Galería profesional</h2><p className="mt-1 text-xs text-[var(--muted)]">La primera imagen será la portada.</p></div><ImagePlus className="hidden size-6 text-[var(--primary)] sm:block" /></div>
              <MarketplaceMediaUploader kind="image" maxFiles={8} value={images} onChange={(next) => setMedia([...next, ...videos])} />
            </div>

            <div className="mt-8 border-t border-[var(--border)] pt-8">
              <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[var(--primary)]">02 · Vídeo</p><h2 className="mt-1 text-xl font-black text-[var(--foreground)]">Demostración del producto o servicio</h2><p className="mt-1 text-xs text-[var(--muted)]">Añade un vídeo principal para venta, catálogo y B2B.</p></div><Video className="hidden size-6 text-[var(--primary)] sm:block" /></div>
              <MarketplaceMediaUploader kind="video" maxFiles={1} multiple={false} value={videos} onChange={(next) => setMedia([...images, ...next])} />
            </div>

            <div className="mt-8 border-t border-[var(--border)] pt-8">
              <div><p className="text-xs font-black uppercase tracking-[.18em] text-[var(--primary)]">03 · Distribución</p><h2 className="mt-1 text-xl font-black text-[var(--foreground)]">Activa tus canales comerciales</h2><p className="mt-1 text-sm text-[var(--muted)]">B2B está disponible como canal de publicación desde el mismo activo. Los controles se guardan junto con la oferta.</p></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {CHANNELS.map(({ key, label, description: channelDescription, icon: Icon }) => <button key={key} type="button" onClick={() => toggleChannel(key)} aria-pressed={channels[key]} className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${channels[key] ? "border-[var(--primary)] bg-[var(--surface-secondary)]" : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)]"}`}><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${channels[key] ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-secondary)] text-[var(--muted)]"}`}><Icon className="size-4" /></span><span className="min-w-0"><span className="block text-sm font-black text-[var(--foreground)]">{label}</span><span className="mt-1 block text-[11px] leading-5 text-[var(--muted)]">{channelDescription}</span></span><span className="ml-auto text-[10px] font-black uppercase tracking-wider text-[var(--primary)]">{channels[key] ? "Activo" : "Inactivo"}</span></button>)}
              </div>
            </div>

            {message && <div role="status" className="mt-7 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="mt-0.5 size-5 shrink-0" /> <span>{message}</span></div>}
            <button type="submit" disabled={publishing} className="mt-7 w-full rounded-2xl bg-[var(--primary)] px-6 py-4 text-sm font-black text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{publishing ? "Guardando oferta…" : `Guardar ${offeringType === "service" ? "servicio" : "bien"} en inventario`}</button>
          </section>

          <div className="space-y-6">
            <ProductPublishCopilot draft={draft} onApply={applySuggestion} />
            <section className="marketplace-card rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl sm:p-7"><p className="text-xs font-black uppercase tracking-[.18em] text-[var(--primary)]">04 · Operación</p><h2 className="mt-1 text-xl font-black text-[var(--foreground)]">Una ficha, un activo comercial</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">La oferta alimenta inventario y publicación multicanal. Desde Inventario y Gestión Empresarial podrás revisar existencias, canales y operaciones.</p><div className="mt-5 grid gap-3">{[["Inventario","/inventario","Existencias y disponibilidad"],["Gestión Empresarial","/gestion-empresarial","Operaciones y rendimiento"],["Compras mayoristas","/compras-mayoristas","Abastecimiento B2B"],["Credi Chat","/chat","Negociación con contexto"]].map(([label, href, desc]) => <a key={href} href={href} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4 transition hover:border-[var(--border-strong)]"><p className="text-sm font-black text-[var(--foreground)]">{label}</p><p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">{desc}</p></a>)}</div></section>
          </div>
        </form>
      </div>
    </main>
  )
}
