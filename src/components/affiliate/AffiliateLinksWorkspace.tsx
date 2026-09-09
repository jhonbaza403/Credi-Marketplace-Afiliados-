"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { CANONICAL_APP_URL } from "@/lib/app-url"

type Product = { id: string; title: string; price: number; image_url: string | null }
type LinkRow = { id: string; product_id: string; code: string; commission_rate_override: number | null; clicks: number; conversions: number; is_active: boolean }

export default function AffiliateLinksWorkspace() {
  const [affiliateId, setAffiliateId] = useState<string | null>(null)
  const [affiliateCode, setAffiliateCode] = useState("")
  const [rate, setRate] = useState(0)
  const [products, setProducts] = useState<Product[]>([])
  const [links, setLinks] = useState<LinkRow[]>([])
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
      if (!affiliate) { setAffiliateId(null); setProducts([]); setLinks([]); return }
      setAffiliateId(affiliate.id); setAffiliateCode(affiliate.code); setRate(Number(affiliate.commission_rate || 0))
      const [{ data: productData, error: productError }, { data: linkData, error: linkError }] = await Promise.all([
        supabase.from("products").select("id,title,price,image_url").eq("is_active", true).order("created_at", { ascending: false }).limit(100),
        supabase.from("affiliate_product_links").select("id,product_id,code,commission_rate_override,clicks,conversions,is_active").eq("affiliate_id", affiliate.id).order("created_at", { ascending: false }),
      ])
      if (productError) throw productError
      if (linkError) throw linkError
      setProducts((productData || []) as Product[]); setLinks((linkData || []) as LinkRow[])
    } catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible cargar el workspace.") } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const linkMap = useMemo(() => new Map(links.map((link) => [link.product_id, link])), [links])
  const filtered = useMemo(() => products.filter((product) => product.title.toLowerCase().includes(search.toLowerCase().trim())), [products, search])
  const activeLinks = links.filter((item) => item.is_active)
  const totalClicks = activeLinks.reduce((sum, item) => sum + Number(item.clicks || 0), 0)
  const totalConversions = activeLinks.reduce((sum, item) => sum + Number(item.conversions || 0), 0)

  async function makeLink(product: Product) {
    if (!affiliateId || !affiliateCode) return
    setBusy(product.id); setMessage(null)
    try {
      const supabase = createClient()
      const code = `cm-${product.id.replaceAll("-", "").slice(0, 8)}-${Math.random().toString(36).slice(2, 7)}`
      const { error } = await supabase.from("affiliate_product_links").upsert({ affiliate_id: affiliateId, product_id: product.id, code, is_active: true }, { onConflict: "affiliate_id,product_id" })
      if (error) throw error
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible crear el enlace.") } finally { setBusy(null) }
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

  function getLink() { return `${CANONICAL_APP_URL}/products?ref=${encodeURIComponent(affiliateCode)}` }

  return <main className="min-h-screen bg-[#050816] text-white"><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
    <header className="overflow-hidden rounded-[2rem] border border-cyan-300/10 bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,.15),transparent_30%),radial-gradient(circle_at_90%_0%,rgba(168,85,247,.16),transparent_32%),linear-gradient(135deg,#0b1024,#060914)] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_30px_100px_rgba(0,0,0,.3)] sm:p-10"><span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Affiliate Commerce Studio</span><h1 className="mt-4 text-3xl font-black sm:text-5xl">Enlaces por producto</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">Cada botón crea un activo asociado a tu afiliado real; el enlace de visita conserva tu código de afiliado y la referencia del producto queda registrada por separado.</p></header>
    {!affiliateId ? <section className="mt-6 rounded-3xl border border-amber-300/15 bg-amber-300/5 p-6 text-sm text-amber-100">Tu perfil de afiliado aún no está activo. Primero completa la solicitud del programa.</section> : <>
      <section className="mt-6 grid gap-4 sm:grid-cols-3"><Metric label="Tasa general" value={`${(rate * 100).toFixed(2)}%`} /><Metric label="Clicks" value={String(totalClicks)} /><Metric label="Conversiones" value={String(totalConversions)} /></section>
      <section className="mt-6 rounded-3xl border border-cyan-300/10 bg-cyan-300/[.04] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Enlace base</p><p className="mt-1 break-all font-mono text-xs text-slate-300">{getLink()}</p></div><button type="button" onClick={() => void navigator.clipboard.writeText(getLink())} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950">Copiar</button></div></section>
      <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[.035] p-6 sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-200">Catálogo</p><h2 className="mt-1 text-xl font-black">Elige qué quieres promocionar</h2></div><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto…" className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none sm:max-w-xs" /></div>
      {loading ? <div className="mt-6 h-48 animate-pulse rounded-2xl bg-white/5" /> : <div className="mt-6 grid gap-4">{filtered.map((product) => { const link = linkMap.get(product.id); const commission = Number((link?.commission_rate_override ?? rate) * 100); return <article key={product.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><h3 className="truncate text-sm font-black text-white">{product.title}</h3><p className="mt-1 text-xs text-slate-400">${Number(product.price).toFixed(2)} · {commission.toFixed(2)}%</p></div>{link ? <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]"><input readOnly value={getLink()} className="min-w-0 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-xs text-slate-300"/><div className="flex items-center gap-2"><span className="text-[10px] font-black text-slate-500">COMISIÓN %</span><input defaultValue={commission.toFixed(2)} onBlur={(e) => void saveRate(link, e.target.value)} className="w-24 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-xs text-white"/></div><button type="button" onClick={() => void navigator.clipboard.writeText(getLink())} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950">Copiar</button></div> : <button type="button" disabled={busy === product.id} onClick={() => void makeLink(product)} className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-xs font-black text-cyan-100 disabled:opacity-50">{busy === product.id ? "Creando…" : "Activar producto"}</button>}</div>{link && <div className="mt-3 flex flex-wrap gap-5 text-[11px] text-slate-400"><span>Producto vinculado</span><span>Clicks <b className="text-white">{link.clicks}</b></span><span>Conversiones <b className="text-white">{link.conversions}</b></span></div>}</article> })}</div>}
      {message && <p role="alert" className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-100">{message}</p>}</section>
    </>}
  </div></main>
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div> }
