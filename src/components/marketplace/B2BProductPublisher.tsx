"use client"

import { FormEvent, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import MarketplaceMediaUploader from "@/components/media/MarketplaceMediaUploader"
import type { UploadedMarketplaceMedia } from "@/lib/storage/marketplace-media"
import { createClient } from "@/lib/supabase/client"

const CATEGORIES = ["Tecnología", "Hogar", "Moda", "Belleza", "Alimentos", "Salud y bienestar", "Automotriz", "Industria", "Oficina", "Otros"]

export default function B2BProductPublisher() {
  const router = useRouter()
  const [form, setForm] = useState({ title: "", category: "Tecnología", description: "", wholesalePrice: "", regularPrice: "", minOrder: "1", stock: "1", country: "US", binancePayId: "", usdtWallet: "" })
  const [images, setImages] = useState<UploadedMarketplaceMedia[]>([])
  const [videos, setVideos] = useState<UploadedMarketplaceMedia[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const imageUrl = images[0]?.url ?? ""
  const videoMedia = useMemo(() => videos.map((item) => ({ url: item.url, kind: item.kind })), [videos])

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error("Debes iniciar sesión para publicar una oferta B2B.")
      if (!form.title.trim() || !form.description.trim() || images.length === 0) throw new Error("Completa título, descripción y al menos una imagen.")

      const wholesale = Number(form.wholesalePrice)
      const regular = Number(form.regularPrice)
      const minOrder = Number(form.minOrder)
      const stock = Number(form.stock)
      if (!Number.isFinite(wholesale) || wholesale <= 0) throw new Error("El precio mayorista debe ser mayor que cero.")
      if (!Number.isFinite(regular) || regular <= 0 || regular < wholesale) throw new Error("El precio de referencia debe ser válido y no menor al mayorista.")
      if (!Number.isInteger(minOrder) || minOrder < 1) throw new Error("La cantidad mínima de pedido no es válida.")
      if (!Number.isInteger(stock) || stock < minOrder) throw new Error("El stock debe ser igual o superior al pedido mínimo.")
      if (form.country.trim().length !== 2) throw new Error("Usa un código de país ISO de dos letras.")

      const { error } = await supabase.from("b2b_products").insert({
        supplier_id: user.id,
        title: form.title.trim(),
        category: form.category,
        wholesale_price_usd: wholesale,
        regular_price_usd: regular,
        min_order_quantity: minOrder,
        stock_available: stock,
        binance_pay_id: form.binancePayId.trim() || null,
        usdt_wallet_address: form.usdtWallet.trim() || null,
        image_url: imageUrl,
        video_media: videoMedia,
        description: form.description.trim(),
        country: form.country.trim().toUpperCase(),
        status: "active",
        moderation_status: "pending_review",
      })
      if (error) throw error

      setMessage("Oferta enviada a revisión. Cuando sea aprobada aparecerá en el mercado B2B.")
      setForm({ title: "", category: "Tecnología", description: "", wholesalePrice: "", regularPrice: "", minOrder: "1", stock: "1", country: "US", binancePayId: "", usdtWallet: "" })
      setImages([])
      setVideos([])
      router.refresh()
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "No fue posible publicar la oferta.")
    } finally {
      setSaving(false)
    }
  }

  return <section className="rounded-[2rem] border border-cyan-300/10 bg-[#07101f]/90 p-6 text-white shadow-[0_30px_100px_rgba(2,8,28,.35)] sm:p-8">
    <div className="mb-8"><p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Publicación B2B</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Presenta tu oferta mayorista</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Carga una imagen principal y un vídeo opcional. La oferta queda pendiente de revisión antes de mostrarse públicamente.</p></div>
    <form onSubmit={submit} className="space-y-7">
      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="Nombre del producto" value={form.title} onChange={(value) => update("title", value)} required />
        <label className="text-sm font-bold">Categoría<select value={form.category} onChange={(event) => update("category", event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-300/50">{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
      </div>
      <label className="block text-sm font-bold">Descripción<textarea required rows={6} maxLength={5000} value={form.description} onChange={(event) => update("description", event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-300/50" placeholder="Especificaciones, condiciones, empaque, disponibilidad y usos..." /></label>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Precio mayorista USD" type="number" min="0.01" step="0.01" value={form.wholesalePrice} onChange={(value) => update("wholesalePrice", value)} required />
        <Field label="Precio de referencia USD" type="number" min="0.01" step="0.01" value={form.regularPrice} onChange={(value) => update("regularPrice", value)} required />
        <Field label="Pedido mínimo" type="number" min="1" step="1" value={form.minOrder} onChange={(value) => update("minOrder", value)} required />
        <Field label="Stock disponible" type="number" min="1" step="1" value={form.stock} onChange={(value) => update("stock", value)} required />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="País del proveedor (ISO-2)" value={form.country} maxLength={2} onChange={(value) => update("country", value.toUpperCase())} required />
        <Field label="Binance Pay ID (opcional)" value={form.binancePayId} onChange={(value) => update("binancePayId", value)} />
        <Field label="Wallet USDT TRC20 (opcional)" value={form.usdtWallet} onChange={(value) => update("usdtWallet", value)} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <MediaBlock title="Imagen principal" note="JPG, PNG, WebP o GIF · hasta 20 MB" kind="image" value={images} onChange={setImages} maxFiles={1} />
        <MediaBlock title="Vídeo del lote (opcional)" note="MP4, WebM o MOV · hasta 500 MB" kind="video" value={videos} onChange={setVideos} maxFiles={1} />
      </div>
      <div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/5 p-4 text-xs leading-5 text-slate-300">Las condiciones comerciales deben ser comprobables. La publicación no constituye aprobación de pagos ni certificación del proveedor. Las ofertas quedan sujetas a controles de plataforma.</div>
      {message && <p role="status" aria-live="polite" className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">{message}</p>}
      <button type="submit" disabled={saving} className="w-full rounded-2xl bg-amber-300 px-5 py-4 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Enviando…" : "Publicar oferta B2B"}</button>
    </form>
  </section>
}

function Field({ label, value, onChange, type = "text", required = false, maxLength = 240 }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; maxLength?: number }) {
  return <label className="block text-sm font-bold">{label}<input required={required} type={type} value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-300/50" /></label>
}

function MediaBlock({ title, note, kind, value, onChange, maxFiles }: { title: string; note: string; kind: "image" | "video"; value: UploadedMarketplaceMedia[]; onChange: (value: UploadedMarketplaceMedia[]) => void; maxFiles: number }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="mb-4"><p className="text-sm font-black">{title}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div><MarketplaceMediaUploader kind={kind} multiple={false} maxFiles={maxFiles} value={value} onChange={onChange} /></div>
}
