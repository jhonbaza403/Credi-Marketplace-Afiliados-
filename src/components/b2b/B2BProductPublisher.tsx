"use client"

import { FormEvent, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import MarketplaceMediaUploader from "@/components/media/MarketplaceMediaUploader"
import type { UploadedMarketplaceMedia } from "@/lib/storage/marketplace-media"

const CATEGORIES = ["Electrónica", "Moda & Accesorios", "Hogar & Construcción", "Alimentos", "Educación & Publicaciones", "Servicios", "Otros"]

export default function B2BProductPublisher() {
  const [form, setForm] = useState({ title: "", category: CATEGORIES[0], wholesale: "", regular: "", moq: "10", stock: "", country: "", description: "" })
  const [images, setImages] = useState<UploadedMarketplaceMedia[]>([])
  const [videos, setVideos] = useState<UploadedMarketplaceMedia[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function update(field: keyof typeof form, value: string) { setForm((current) => ({ ...current, [field]: value })); setMessage(null) }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null)
    const wholesale = Number(form.wholesale), regular = Number(form.regular), moq = Number(form.moq), stock = Number(form.stock)
    if (form.title.trim().length < 3) return setMessage("Indica el nombre de la oferta.")
    if (!(wholesale > 0) || !(regular > wholesale)) return setMessage("Revisa los precios mayorista y de referencia.")
    if (!Number.isInteger(moq) || moq < 1 || !Number.isInteger(stock) || stock < moq) return setMessage("El MOQ y el stock deben ser cantidades válidas.")
    if (form.description.trim().length < 20) return setMessage("Añade una descripción comercial de al menos 20 caracteres.")
    if (!images.length) return setMessage("Añade al menos una imagen.")
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error("Debes iniciar sesión para publicar una oferta B2B.")
      const { error } = await supabase.from("b2b_products").insert({
        supplier_id: user.id,
        title: form.title.trim(),
        category: form.category,
        wholesale_price_usd: wholesale,
        regular_price_usd: regular,
        min_order_quantity: moq,
        stock_available: stock,
        image_url: images[0]?.url ?? null,
        video_media: videos.map((item) => ({ path: item.path, url: item.url, name: item.name, contentType: item.contentType, size: item.size })),
        description: form.description.trim(),
        country: form.country.trim() || null,
        status: "draft",
        moderation_status: "pending",
      })
      if (error) throw error
      setMessage("Oferta B2B creada y enviada a revisión.")
      setForm({ title: "", category: CATEGORIES[0], wholesale: "", regular: "", moq: "10", stock: "", country: "", description: "" }); setImages([]); setVideos([])
    } catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible publicar la oferta.") } finally { setSaving(false) }
  }

  return <main className="min-h-screen bg-[#050816] text-white"><div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8"><header className="mb-6 rounded-[2rem] border border-amber-300/10 bg-[radial-gradient(circle_at_12%_10%,rgba(245,158,11,.14),transparent_32%),radial-gradient(circle_at_90%_0%,rgba(34,211,238,.12),transparent_32%),linear-gradient(135deg,#0b1024,#060914)] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_30px_100px_rgba(0,0,0,.3)] sm:p-10"><span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-amber-100">Credi B2B Studio</span><h1 className="mt-4 text-3xl font-black sm:text-5xl">Publica una oferta mayorista con vídeo.</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">Carga fotografías y un vídeo del producto; la oferta queda registrada y pasa por el estado de moderación definido por el backend.</p></header>
    <form onSubmit={submit} className="rounded-[2rem] border border-white/10 bg-white/[.035] p-6 sm:p-8"><div className="grid gap-5 sm:grid-cols-2"><Field label="Producto o lote" value={form.title} onChange={(v) => update("title", v)} required /><label className="text-sm font-bold">Categoría<select value={form.category} onChange={(e) => update("category", e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label><Field label="Precio mayorista USD" type="number" value={form.wholesale} onChange={(v) => update("wholesale", v)} required /><Field label="Precio de referencia USD" type="number" value={form.regular} onChange={(v) => update("regular", v)} required /><Field label="MOQ" type="number" value={form.moq} onChange={(v) => update("moq", v)} required /><Field label="Stock disponible" type="number" value={form.stock} onChange={(v) => update("stock", v)} required /><Field label="País de origen" value={form.country} onChange={(v) => update("country", v)} /><label className="sm:col-span-2 text-sm font-bold">Descripción<textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={7} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3" /></label></div>
      <div className="mt-8 border-t border-white/10 pt-7"><p className="text-sm font-black">Imágenes</p><p className="mt-1 text-xs text-slate-400">La primera imagen será la portada.</p><div className="mt-3"><MarketplaceMediaUploader kind="image" value={images} onChange={setImages} /></div></div>
      <div className="mt-8 border-t border-white/10 pt-7"><p className="text-sm font-black">Vídeo B2B</p><p className="mt-1 text-xs text-slate-400">Presenta el producto, el lote o su disponibilidad con vídeo.</p><div className="mt-3"><MarketplaceMediaUploader kind="video" multiple={false} maxFiles={1} value={videos} onChange={setVideos} /></div></div>
      {message && <p role="status" className="mt-6 rounded-2xl border border-cyan-300/15 bg-cyan-300/5 p-4 text-sm text-cyan-100">{message}</p>}
      <button disabled={saving} type="submit" className="mt-7 w-full rounded-2xl bg-amber-300 px-6 py-4 text-sm font-black text-slate-950 disabled:opacity-50">{saving ? "Guardando oferta…" : "Publicar oferta B2B"}</button>
    </form></div></main>
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="text-sm font-bold">{label}<input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 outline-none focus:border-cyan-300/50" /></label> }
