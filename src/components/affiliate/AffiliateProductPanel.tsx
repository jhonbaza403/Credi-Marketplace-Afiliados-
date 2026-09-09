"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { CANONICAL_APP_URL } from "@/lib/app-url"

type Product = { id: string; title: string; price: number; image_url: string | null }
type LinkRow = { id: string; product_id: string; code: string; commission_rate_override: number | null; clicks: number; conversions: number; is_active: boolean }

export default function AffiliateProductPanel() {
  const [products, setProducts] = useState<Product[]>([])
  const [links, setLinks] = useState<LinkRow[]>([])
  const [affiliateId, setAffiliateId] = useState<string | null>(null)
  const [rate, setRate] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setMessage(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Inicia sesión para administrar enlaces.")
      const { data: affiliate, error: affiliateError } = await supabase.from("affiliates").select("id, commission_rate").eq("user_id", user.id).eq("is_active", true).maybeSingle()
      if (affiliateError) throw affiliateError
      if (!affiliate) { setAffiliateId(null); setProducts([]); setLinks([]); return }
      setAffiliateId(affiliate.id); setRate(Number(affiliate.commission_rate || 0))
      const [{ data: productData, error: productError }, { data: linkData, error: linkError }] = await Promise.all([
        supabase.from("products").select("id,title,price,image_url").eq("is_active", true).order("created_at", { ascending: false }).limit(60),
        supabase.from("affiliate_product_links").select("id,product_id,code,commission_rate_override,clicks,conversions,is_active").eq("affiliate_id", affiliate.id).order("created_at", { ascending: false }),
      ])
      if (productError) throw productError
      if (linkError) throw linkError
      setProducts((productData || []) as Product[]); setLinks((linkData || []) as LinkRow[])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible cargar el panel.")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const linkMap = useMemo(() => new Map(links.map((item) => [item.product_id, item])), [links])

  async function createLink(product: Product) {
    if (!affiliateId) return
    setBusy(product.id); setMessage(null)
    try {
      const supabase = createClient()
      const seed = product.id.replaceAll("-", "").slice(0, 8)
      const code = `cm-${Math.random().toString(36).slice(2, 7)}-${seed}`
      const { error } = await supabase.from("affiliate_product_links").upsert({ affiliate_id: affiliateId, product_id: product.id, code, is_active: true }, { onConflict: "affiliate_id,product_id" })
      if (error) throw error
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible crear el enlace.") } finally { setBusy(null) }
  }

  async function saveCommission(row: LinkRow, percent: string) {
    const value = Number(percent)
    if (!Number.isFinite(value) || value < 0 || value > 100) return
    setBusy(row.id); setMessage(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("affiliate_product_links").update({ commission_rate_override: value / 100 }).eq("id", row.id)
      if (error) throw error
      setLinks((current) => current.map((item) => item.id === row.id ? { ...item, commission_rate_override: value / 100 } : item))
    } catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible actualizar la comisión.") } finally { setBusy(null) }
  }

  function url(code: string) { return `${CANONICAL_APP_URL}/products?ref=${encodeURIComponent(code)}` }

  return (
    <section className="mt-6 rounded-[2rem] border border-cyan-300/10 bg-slate-950/70 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_24px_70px_rgba(2,8,28,.24)] sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><span className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Monetiza por producto</span><h2 className="mt-2 text-xl font-black text-white">Enlaces y comisiones</h2><p className="mt-1 text-sm text-slate-400">Crea un enlace específico para cada producto y define una tasa especial sin perder la tasa general de tu cuenta.</p></div><button type="button" onClick={() => void load()} className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-2 text-xs font-black text-slate-200">Actualizar</button></div>
      {!affiliateId ? <div className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-300/5 p-5 text-sm text-amber-100">Tu cuenta todavía no tiene un perfil de afiliado activo. Completa la solicitud y espera la aprobación.</div> : loading ? <div className="mt-6 h-40 animate-pulse rounded-2xl bg-white/5" /> : (
        <div className="mt-6 grid gap-4">{products.map((product) => {
          const row = linkMap.get(product.id)
          const commission = Number((row?.commission_rate_override ?? rate) * 100)
          return <article key={product.id} className="rounded-2xl border border-white/10 bg-white/[.035] p-4 sm:p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="min-w-0"><h3 className="truncate text-sm font-black text-white">{product.title}</h3><p className="mt-1 text-xs text-slate-400">${Number(product.price).toFixed(2)} · {commission.toFixed(2)}% comisión</p></div>{row ? <div className="flex flex-col gap-3 xl:min-w-[520px] xl:flex-row xl:items-center"><input readOnly value={url(row.code)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-xs text-slate-300"/><div className="flex items-center gap-2"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">%</label><input defaultValue={commission.toFixed(2)} onBlur={(e) => void saveCommission(row, e.target.value)} className="w-24 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-xs text-white"/><button type="button" onClick={() => navigator.clipboard.writeText(url(row.code))} className="rounded-xl bg-cyan-300 px-3 py-2.5 text-xs font-black text-slate-950">Copiar</button></div></div> : <button type="button" disabled={busy === product.id} onClick={() => void createLink(product)} className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-xs font-black text-cyan-100 disabled:opacity-50">{busy === product.id ? "Creando…" : "Crear enlace"}</button>}</div>{row && <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-400"><span>Clicks: <b className="text-slate-200">{row.clicks}</b></span><span>Conversiones: <b className="text-slate-200">{row.conversions}</b></span></div>}</article>
        })}</div>
      )}
      {message && <p role="alert" className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-100">{message}</p>}
    </section>
  )
}
