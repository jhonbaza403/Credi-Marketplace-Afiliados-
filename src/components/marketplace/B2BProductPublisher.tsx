"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, ShieldCheck } from "lucide-react"
import MarketplaceMediaUploader from "@/components/media/MarketplaceMediaUploader"
import type { UploadedMarketplaceMedia } from "@/lib/storage/marketplace-media"

const CATEGORIES = ["Tecnología", "Hogar", "Moda", "Belleza", "Alimentos", "Salud y bienestar", "Automotriz", "Industria", "Oficina", "Otros"]

type Access = { can_sell: boolean; email_confirmed: boolean; kyc_status: string; kyb_status: string; store_verified: boolean; risk_blocked: boolean }

export default function B2BProductPublisher() {
  const router = useRouter()
  const [form, setForm] = useState({ title: "", category: "Tecnología", description: "", wholesalePrice: "", regularPrice: "", minOrder: "1", stock: "1", country: "US", binancePayId: "", usdtWallet: "" })
  const [images, setImages] = useState<UploadedMarketplaceMedia[]>([])
  const [videos, setVideos] = useState<UploadedMarketplaceMedia[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [access, setAccess] = useState<Access | null>(null)
  const [accessLoading, setAccessLoading] = useState(true)

  const videoMedia = useMemo(() => videos.map((item) => ({ url: item.url, kind: item.kind })), [videos])

  useEffect(() => {
    fetch("/api/b2b/access", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("No fue posible comprobar tu autorización B2B.")
        return (await response.json()) as Access
      })
      .then(setAccess)
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "No fue posible comprobar tu autorización B2B."))
      .finally(() => setAccessLoading(false))
  }, [])

  function update(key: keyof typeof form, value: string) { setForm((current) => ({ ...current, [key]: value })) }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    if (!access?.can_sell) { setMessage("La publicación B2B está bloqueada hasta completar KYC, KYB, verificación de tienda y controles de riesgo."); return }
    setSaving(true); setMessage(null)
    try {
      if (!form.title.trim() || !form.description.trim() || images.length === 0) throw new Error("Completa título, descripción y al menos una imagen.")
      const response = await fetch("/api/b2b/products", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ title: form.title.trim(), category: form.category, description: form.description.trim(), wholesale: Number(form.wholesalePrice), regular: Number(form.regularPrice), moq: Number(form.minOrder), stock: Number(form.stock), country: form.country.trim().toUpperCase(), binancePayId: form.binancePayId.trim(), usdtWalletAddress: form.usdtWallet.trim(), images: images.map((item) => ({ url: item.url, kind: item.kind })), videos: videoMedia }) })
      const result = await response.json() as { success?: boolean; error?: string; message?: string }
      if (!response.ok || !result.success) throw new Error(result.message || result.error || "No fue posible registrar la oferta B2B.")
      setMessage("Oferta enviada a revisión. Cuando sea aprobada aparecerá en el mercado B2B.")
      setForm({ title: "", category: "Tecnología", description: "", wholesalePrice: "", regularPrice: "", minOrder: "1", stock: "1", country: "US", binancePayId: "", usdtWallet: "" }); setImages([]); setVideos([]); router.refresh()
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : "No fue posible publicar la oferta.") }
    finally { setSaving(false) }
  }

  if (accessLoading) return <section aria-busy="true" className="rounded-[2rem] border border-cyan-300/10 bg-[#07101f]/90 p-8 text-white"><div className="h-7 w-64 animate-pulse rounded bg-white/10" /><div className="mt-4 h-24 animate-pulse rounded-2xl bg-white/5" /></section>

  if (!access?.can_sell) return <section className="rounded-[2rem] border border-amber-300/20 bg-[#07101f]/95 p-6 text-white shadow-2xl sm:p-8"><div className="flex items-start gap-4"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-200"><ShieldCheck /></span><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-200">Protección del vendedor</p><h1 className="mt-2 text-3xl font-black">Publicación B2B reservada a empresas verificadas</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Credi no permite cargar una oferta comercial hasta confirmar identidad, empresa y ausencia de bloqueos de riesgo. Esto reduce perfiles falsos y ofertas utilizadas para fraude.</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><Status label="Correo confirmado" ok={access?.email_confirmed} /><Status label="KYC aprobado" ok={access?.kyc_status === "approved"} /><Status label="KYB aprobado" ok={access?.kyb_status === "approved"} /><Status label="Tienda verificada" ok={access?.store_verified} /><Status label="Sin alertas de riesgo" ok={!access?.risk_blocked} /></div>{message && <p role="alert" className="mt-5 rounded-2xl border border-amber-200/20 bg-amber-300/5 p-4 text-sm text-amber-100">{message}</p>}<Link href="/account/verificacion" className="mt-6 inline-flex rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950">Completar verificación</Link></section>

  return <section className="rounded-[2rem] border border-cyan-300/10 bg-[#07101f]/90 p-6 text-white shadow-[0_30px_100px_rgba(2,8,28,.35)] sm:p-8"><div className="mb-8"><p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Publicación B2B verificada</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Presenta tu oferta mayorista</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">La oferta se envía primero a revisión y solo se publica cuando conserva las condiciones de confianza de Credi.</p></div><form onSubmit={submit} className="space-y-7"><div className="grid gap-5 lg:grid-cols-2"><Field label="Nombre del producto" value={form.title} onChange={(value) => update("title", value)} required /><label className="text-sm font-bold">Categoría<select value={form.category} onChange={(event) => update("category", event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-300/50">{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label></div><label className="block text-sm font-bold">Descripción<textarea required rows={6} maxLength={12000} value={form.description} onChange={(event) => update("description", event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-300/50" placeholder="Especificaciones, condiciones, empaque, disponibilidad y usos..." /></label><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><Field label="Precio mayorista USD" type="number" min="0.01" step="0.01" value={form.wholesalePrice} onChange={(value) => update("wholesalePrice", value)} required /><Field label="Precio de referencia USD" type="number" min="0.01" step="0.01" value={form.regularPrice} onChange={(value) => update("regularPrice", value)} required /><Field label="Pedido mínimo" type="number" min="1" step="1" value={form.minOrder} onChange={(value) => update("minOrder", value)} required /><Field label="Stock disponible" type="number" min="1" step="1" value={form.stock} onChange={(value) => update("stock", value)} required /></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><Field label="País del proveedor (ISO-2)" value={form.country} maxLength={2} onChange={(value) => update("country", value.toUpperCase())} required /><Field label="Binance Pay ID (opcional)" value={form.binancePayId} onChange={(value) => update("binancePayId", value)} /><Field label="Wallet USDT TRC20 (opcional)" value={form.usdtWallet} onChange={(value) => update("usdtWallet", value)} /></div><div className="grid gap-5 lg:grid-cols-2"><MediaBlock title="Imagen principal" note="JPG, PNG, WebP o GIF · hasta 20 MB" kind="image" value={images} onChange={setImages} maxFiles={1} /><MediaBlock title="Vídeo del lote (opcional)" note="MP4, WebM o MOV · hasta 500 MB" kind="video" value={videos} onChange={setVideos} maxFiles={1} /></div><div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/5 p-4 text-xs leading-5 text-slate-300">Las condiciones comerciales deben ser comprobables. La publicación no constituye aprobación de pagos ni certificación del proveedor. Las ofertas quedan sujetas a controles de plataforma.</div>{message && <p role="status" aria-live="polite" className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">{message}</p>}<button type="submit" disabled={saving} className="w-full rounded-2xl bg-amber-300 px-5 py-4 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Enviando…" : "Enviar oferta a revisión"}</button></form></section>
}

function Status({ label, ok }: { label: string; ok: boolean }) { return <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] px-4 py-3 text-sm">{ok ? <CheckCircle2 className="size-5 text-emerald-300" /> : <ShieldCheck className="size-5 text-amber-300" />}<span>{label}</span></div> }
function Field({ label, value, onChange, type = "text", required = false, maxLength = 240, min, step }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; maxLength?: number; min?: string; step?: string }) { return <label className="block text-sm font-bold">{label}<input required={required} type={type} value={value} min={min} step={step} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-300/50" /></label> }
function MediaBlock({ title, note, kind, value, onChange, maxFiles }: { title: string; note: string; kind: "image" | "video"; value: UploadedMarketplaceMedia[]; onChange: (value: UploadedMarketplaceMedia[]) => void; maxFiles: number }) { return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="mb-4"><p className="text-sm font-black">{title}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div><MarketplaceMediaUploader kind={kind} multiple={false} maxFiles={maxFiles} value={value} onChange={onChange} /></div> }
