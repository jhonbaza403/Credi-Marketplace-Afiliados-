"use client"

import { FormEvent, useState } from "react"
import { createClient } from "@/lib/supabase/client"

const METHODS = ["Redes sociales", "Contenido / blog", "Vídeo", "Email", "Publicidad digital", "Comunidad", "Referidos directos"]
const TERMS_VERSION = "2026-09"
const COUNTRIES = [
  ["US", "Estados Unidos"], ["VE", "Venezuela"], ["CO", "Colombia"], ["MX", "México"], ["ES", "España"], ["AR", "Argentina"], ["BR", "Brasil"], ["CL", "Chile"], ["PE", "Perú"], ["OTHER", "Otro"],
] as const

export default function AffiliateApplicationForm() {
  const [form, setForm] = useState({ country: "US", legalName: "", displayName: "", email: "", phone: "", websiteUrl: "", instagram: "", tiktok: "", youtube: "", taxCountry: "", taxId: "" })
  const [methods, setMethods] = useState<string[]>([])
  const [accepted, setAccepted] = useState(false)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  function toggleMethod(item: string) { setMethods((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]) }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus(null)
    if (!accepted) return setStatus("Debes aceptar las condiciones del programa.")
    if (!form.legalName.trim() || !form.email.trim() || methods.length === 0) return setStatus("Completa nombre, correo y al menos un método de promoción.")
    if (form.country === "OTHER") return setStatus("Selecciona un país compatible con código ISO de 2 letras.")
    setSending(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.assign(`/login?next=${encodeURIComponent("/affiliate")}`)
        return
      }
      const { data: existing } = await supabase.from("affiliate_applications").select("id,status").eq("user_id", user.id).in("status", ["pending", "approved"]).maybeSingle()
      if (existing) throw new Error(existing.status === "approved" ? "Ya tienes una solicitud aprobada." : "Ya tienes una solicitud pendiente de revisión.")
      const { error } = await supabase.from("affiliate_applications").insert({
        user_id: user.id, country: form.country, legal_name: form.legalName.trim(), display_name: form.displayName.trim() || null, email: form.email.trim(), phone: form.phone.trim() || null, website_url: form.websiteUrl.trim() || null,
        social_profiles: { instagram: form.instagram.trim(), tiktok: form.tiktok.trim(), youtube: form.youtube.trim() }, promotion_methods: methods, tax_residency_country: form.taxCountry.trim().toUpperCase() || null, tax_id: form.taxId.trim() || null,
        terms_version: TERMS_VERSION, privacy_version: TERMS_VERSION, affiliate_policy_version: TERMS_VERSION, disclosures_accepted: true, consent_at: new Date().toISOString(), status: "pending",
      })
      if (error) throw error
      setStatus("Solicitud enviada. Quedará pendiente de revisión.")
    } catch (error) { setStatus(error instanceof Error ? error.message : "No fue posible enviar la solicitud.") }
    finally { setSending(false) }
  }

  return <form onSubmit={submit} className="rounded-[2rem] border border-white/10 bg-white/[.035] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_24px_70px_rgba(2,8,28,.28)] sm:p-8">
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Nombre legal" value={form.legalName} onChange={(value) => setForm({ ...form, legalName: value })} required />
      <Field label="Nombre público" value={form.displayName} onChange={(value) => setForm({ ...form, displayName: value })} />
      <Field label="Correo" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} required />
      <Field label="Teléfono" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
      <label className="text-sm font-bold text-slate-100">País<select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white">{COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
      <Field label="Sitio web" type="url" value={form.websiteUrl} onChange={(value) => setForm({ ...form, websiteUrl: value })} />
      <Field label="Instagram" value={form.instagram} onChange={(value) => setForm({ ...form, instagram: value })} />
      <Field label="TikTok" value={form.tiktok} onChange={(value) => setForm({ ...form, tiktok: value })} />
      <Field label="YouTube" value={form.youtube} onChange={(value) => setForm({ ...form, youtube: value })} />
      <Field label="País de residencia fiscal" value={form.taxCountry} onChange={(value) => setForm({ ...form, taxCountry: value })} />
      <Field label="Identificación fiscal" value={form.taxId} onChange={(value) => setForm({ ...form, taxId: value })} />
    </div>
    <div className="mt-7"><p className="text-sm font-black text-white">¿Cómo promocionarás productos?</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{METHODS.map((item) => <label key={item} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[.025] px-4 py-3 text-sm text-slate-200"><input type="checkbox" checked={methods.includes(item)} onChange={() => toggleMethod(item)} className="accent-cyan-300" />{item}</label>)}</div></div>
    <label className="mt-6 flex items-start gap-3 rounded-2xl border border-cyan-300/10 bg-cyan-300/5 p-4 text-xs leading-5 text-slate-200"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 accent-cyan-300" />Acepto las condiciones del programa, la política de privacidad y las reglas de divulgación del contenido afiliado.</label>
    {status && <p role="status" aria-live="polite" className="mt-5 rounded-2xl border border-cyan-300/15 bg-cyan-300/5 p-4 text-sm text-cyan-100">{status}</p>}
    <button disabled={sending} type="submit" className="mt-6 w-full rounded-2xl bg-cyan-300 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">{sending ? "Enviando solicitud…" : "Solicitar ingreso al programa"}</button>
  </form>
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="text-sm font-bold text-slate-100">{label}<input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} maxLength={240} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-300/50" /></label>
}
