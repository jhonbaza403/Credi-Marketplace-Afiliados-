"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { CANONICAL_APP_URL } from "@/lib/app-url"

type Product = { id: string; title: string; price: number; image_url: string | null }
type LinkRow = { id: string; product_id: string; code: string; commission_rate_override: number | null; clicks: number; conversions: number; is_active: boolean }

type AffiliateProduct = { product_id: string; affiliate_url: string; is_active: boolean }

function normalizeAffiliateUrl(value: string) {
  const url = new URL(value.trim())
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("La URL afiliada debe usar HTTPS y no contener credenciales.")
  if (url.href.length > 2048) throw new Error("La URL afiliada supera el máximo permitido.")
  return url.href
}

export default function AffiliateLinksWorkspace() {
  const [affiliateId, setAffiliateId] = useState<string | null>(null)
  const [affiliateCode, setAffiliateCode] = useState("")
  const [rate, setRate] = useState(0)
  const [products, setProducts] = useState<Product[]>([])
  const [links, setLinks] = useState<LinkRow[]>([])
  const [affiliateProducts, setAffiliateProducts] = useState<AffiliateProduct[]>([])
  const [affiliateUrls, setAffiliateUrls] = useState<Record<string, string>>({})
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setMessage(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Debes iniciar sesión.")
      const { data: affiliate, error: affiliateError } = await supabase.from("affiliates").select("id,code,commission_rate").eq("user_id", user.id).eq("is_active", true).maybeSingle()
      if (affiliateError) throw affiliateError
      if (!affiliate) { setAffiliateId(null); setProducts([]); setLinks([]); setAffiliateProducts([]); return }
      setAffiliateId(affiliate.id); setAffiliateCode(affiliate.code); setRate(Number(affiliate.commission_rate || 0))
      const [{ data: productData, error: productError }, { data: linkData, error: linkError }, { data: affiliateProductData, error: affiliateProductError }] = await Promise.all([
        supabase.from("products").select("id,title,price,image_url").eq("is_active", true).order("created_at", { ascending: false }).limit(100),
        supabase.from("affiliate_product_links").select("id,product_id,code,commission_rate_override,clicks,conversions,is_active").eq("affiliate_id", affiliate.id).order("created_at", { ascending: false }),
        supabase.from("affiliate_products").select("product_id,affiliate_url,is_active").eq("affiliate_id", affiliate.id).order("created_at", { ascending: false }),
      ])
      if (productError) throw productError
      if (linkError) throw linkError
      if (affiliateProductError) throw affiliateProductError
      setProducts((productData || []) as Product[]); setLinks((linkData || []) as LinkRow[]); setAffiliateProducts((affiliateProductData || []) as AffiliateProduct[])
      setAffiliateUrls(Object.fromEntries(((affiliateProductData || []) as AffiliateProduct[]).map((item) => [item.product_id, item.affiliate_url])))
    } catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible cargar el workspace.") } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])
  const linkMap = useMemo(() => new Map(links.map((link) => [link.product_id, link])), [links])
  const affiliateProductMap = useMemo(() => new Map(affiliateProducts.map((item) => [item.product_id, item])), [affiliateProducts])
  const filtered = useMemo(() => products.filter((product) => product.title.toLowerCase().includes(search.toLowerCase().trim())), [products, search])
  const activeLinks = links.filter((item) => item.is_active)
  const totalClicks = activeLinks.reduce((sum, item) => sum + Number(item.clicks || 0), 0)
  const totalConversions = activeLinks.reduce((sum, item) => sum + Number(item.conversions || 0), 0)

  async function makeLink(product: Product) {
    if (!affiliateId || !affiliateCode) return
    setBusy(product.id); setMessage(null)
    try {
      const externalValue = affiliateUrls[product.id]?.trim() || ""
      if (!externalValue) throw new Error("Registra primero la URL externa del programa afiliado para este producto.")
      const affiliateUrl = normalizeAffiliateUrl(externalValue)
      const supabase = createClient()
      const { error: affiliateProductError } = await supabase.from("affiliate_products").upsert({ affiliate_id: affiliateId, product_id: product.id, affiliate_url: affiliateUrl, is_active: true }, { onConflict: "affiliate_id,product_id" })
      if (affiliateProductError) throw affiliateProductError
      const code = `cm-${product.id.replaceAll("-", "").slice(0, 8)}-${Math.random().toString(36).slice(2, 7)}`
      const { error } = await supabase.from("affiliate_product_links").upsert({ affiliate_id: affiliateId, product_id: product.id, code, is_active: true }, { onConflict: "affiliate_id,product_id" })
      if (error) throw error
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible crear el enlace.") } finally { setBusy(null) }
  }

  async function saveAffiliateUrl(productId: string) {
    if (!affiliateId) return
    setBusy(productId); setMessage(null)
    try {
      const affiliateUrl = normalizeAffiliateUrl(affiliateUrls[productId] || "")
      const supabase = createClient()
      const { error } = await supabase.from("affiliate_products").upsert({ affiliate_id: affiliateId, product_id: productId, affiliate_url: affiliateUrl, is_active: true }, { onConflict: "affiliate_id,product_id" })
      if (error) throw error
      setAffiliateProducts((current) => [...current.filter((item) => item.product_id !== productId), { product_id: productId, affiliate_url: affiliateUrl, is_active: true }])
      setMessage("URL afiliada guardada.")
    } catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible guardar la URL afiliada.") } finally { setBusy(null) }
  }

  async function saveRate(link: LinkRow, input: string) {
    const percent = Number(input)
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) return
    setBusy(link.id)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("affiliate_product_links").update({ commission_rate_override: percent / 100 }).eq("id", link.id)
      if (error) throw error
      setLinks((current) => current.map((item) => item.id === link.id ? { ...item, commission_rate_override: percent / 100 } : item))
    } catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible guardar la comisión.") } finally { setBusy(null) }
  }

  function getLink(productId?: string, linkCode?: string) {
    const params = new URLSearchParams()
    if (affiliateCode) params.set("ref", affiliateCode)
    if (productId) params.set("id", productId)
    if (linkCode) params.set("pl", linkCode)
    return productId
      ? `${CANONICAL_APP_URL}/products/detail?${params.toString()}`
      : `${CANONICAL_APP_URL}/products?${params.toString()}`
  }

  return <main className="min-h-screen bg-[#050816] text-white"><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
    <header className="overflow-hidden rounded-[2rem] border border-cyan-300/10 bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,.15),transparent_30%),radial-gradient(circle_at_90%_0%,rgba(168,85,247,.16),transparent_32%),linear-gradient(135deg,#0b1024,#060914)] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_30px_100px_rgba(0,0,0,.3)] sm:p-10"><span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Affiliate Commerce Studio</span><h1 className="mt-4 text-3xl font-black sm:text-5xl">Enlaces por producto</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">Cada producto conserva su URL externa afiliada y su enlace Credi rastreable. La URL externa nunca se sustituye por el enlace interno.</p></header>
    {!affiliateId ? <section className="mt-6 rounded-3xl border border-amber-300/15 bg-amber-300/5 p-6 text-sm text-amber-100">Tu perfil de afiliado aún no está activo. Primero completa la solicitud del programa.</section> : <>
      <section className="mt-6 grid gap-4 sm:grid-cols-3"><Metric label="Tasa general" value={`${(rate * 100).toFixed(2)}%`} /><Metric label="Clicks" value={String(totalClicks)} /><Metric label="Conversiones" value={String(totalConversions)} /></section>
      <section className="mt-6 rounded-3xl border border-cyan-300/10 bg-cyan-300/[.04] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Enlace base</p><p className="mt-1 break-all font-mono text-xs text-slate-300">{getLink()}</p></div><button type="button" onClick={() => void navigator.clipboard.writeText(getLink())} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950">Copiar</button></div></section>
      <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[.035] p-6 sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-200">Catálogo</p><h2 className="mt-1 text-xl font-black">Elige qué quieres promocionar</h2></div><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto…" className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none sm:max-w-xs" /></div>
      {loading ? <div className="mt-6 h-48 animate-pulse rounded-2xl bg-white/5" /> : <div className="mt-6 grid gap-4">{filtered.map((product) => { const link = linkMap.get(product.id); const external = affiliateProductMap.get(product.id); const commission = Number((link?.commission_rate_override ?? rate) * 100); const productLink = link ? getLink(product.id, link.code) : ""; return <article key={product.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex flex-col gap-4"><div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><h3 className="truncate text-sm font-black text-white">{product.title}</h3><p className="mt-1 text-xs text-slate-400">${Number(product.price).toFixed(2)} · {commission.toFixed(2)}%</p></div>{link ? <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]"><input readOnly value={productLink} className="min-w-0 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-xs text-slate-300"/><div className="flex items-center gap-2"><span className="text-[10px] font-black text-slate-500">COMISIÓN %</span><input defaultValue={commission.toFixed(2)} onBlur={(e) => void saveRate(link, e.target.value)} className="w-24 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-xs text-white"/></div><button type="button" onClick={() => void navigator.clipboard.writeText(productLink)} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950">Copiar</button></div> : null}</div><div className="grid gap-2 md:grid-cols-[1fr_auto]"><div className="flex items-center gap-2"><input value={affiliateUrls[product.id] || ""} onChange={(e) => setAffiliateUrls((current) => ({ ...current, [product.id]: e.target.value }))} placeholder="https://… URL externa de Amazon, SHEIN, AliExpress, Alibaba…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-xs text-white outline-none"/><button type="button" disabled={busy === product.id} onClick={() => void saveAffiliateUrl(product.id)} className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-xs font-black text-cyan-100 disabled:opacity-50">Guardar URL</button></div><button type="button" disabled={busy === product.id || !affiliateUrls[product.id]?.trim()} onClick={() => void makeLink(product)} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950 disabled:opacity-40">{link ? "Regenerar vínculo" : busy === product.id ? "Creando…" : "Activar producto"}</button></div>{external && <p className="text-[11px] text-slate-500">URL externa registrada y asociada a este producto.</p>}{link && <div className="mt-1 flex flex-wrap gap-5 text-[11px] text-slate-400"><span>Producto vinculado</span><span>Clicks <b className="text-white">{link.clicks}</b></span><span>Conversiones <b className="text-white">{link.conversions}</b></span></div>}</div></article> })}</div>}
      {message && <p role="alert" className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-100">{message}</p>}</section>
    </>}
  </div></main>
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div> }
