"use client"

import { useState } from "react"

export interface ProductSuggestion {
  title: string
  description: string
  category: string
  tags: string[]
  sellingPoints: string[]
  checklist: string[]
  complianceNotes: string[]
}

interface Props {
  draft: { title: string; description: string; category: string; price: string; stock: string; country?: string; audience?: string }
  onApply: (value: ProductSuggestion) => void
}

export default function ProductPublishCopilot({ draft, onApply }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ProductSuggestion | null>(null)

  async function improve() {
    setLoading(true); setError(null)
    try {
      const response = await fetch("/api/ai/product-publisher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) })
      const data = await response.json() as { suggestion?: ProductSuggestion; error?: string }
      if (!response.ok || !data.suggestion) throw new Error(data.error || "No fue posible mejorar la publicación.")
      setResult(data.suggestion)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible usar la asistencia.")
    } finally { setLoading(false) }
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-cyan-300/20 bg-slate-950/80 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_24px_70px_rgba(2,8,28,.35)]">
      <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div><span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Asistente de publicación</span><h2 className="mt-3 text-xl font-black text-white">Optimiza tu ficha antes de publicarla</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Solo prepara título, descripción, SEO, beneficios y checklist usando la información que tú proporcionas. No publica ni realiza pagos.</p></div>
        <button type="button" disabled={loading} onClick={() => void improve()} className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{loading ? "Analizando…" : "Mejorar publicación"}</button>
      </div>
      {error && <p role="alert" className="relative mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</p>}
      {result && <div className="relative mt-5 grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><p className="text-xs font-black uppercase tracking-wider text-cyan-200">Propuesta</p><h3 className="mt-2 font-black text-white">{result.title}</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">{result.description}</p><div className="mt-4 flex flex-wrap gap-2">{result.sellingPoints.slice(0, 8).map((item) => <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">{item}</span>)}</div></div>
        <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><p className="text-xs font-black uppercase tracking-wider text-cyan-200">Checklist</p><ul className="mt-3 space-y-2 text-sm text-slate-200">{result.checklist.slice(0, 7).map((item) => <li key={item} className="flex gap-2"><span className="text-cyan-300">✓</span>{item}</li>)}</ul><div className="mt-4 flex flex-wrap gap-2">{result.tags.slice(0, 10).map((item) => <span key={item} className="rounded-lg bg-cyan-300/10 px-2.5 py-1 text-xs font-bold text-cyan-200">#{item.replace(/^#/, "")}</span>)}</div></div>
        <div className="lg:col-span-2 flex flex-col gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/5 p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-emerald-100">Revisa antes de publicar. La publicación final siempre la confirma el vendedor.</p><button type="button" onClick={() => onApply(result)} className="rounded-xl border border-emerald-300/20 px-4 py-2.5 text-xs font-black text-emerald-100">Aplicar mejoras</button></div>
      </div>}
    </section>
  )
}
