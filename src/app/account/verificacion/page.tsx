"use client"

import Link from "next/link"
import { FormEvent, useEffect, useMemo, useState } from "react"
import { CheckCircle2, CircleAlert, FileCheck2, Loader2, ShieldCheck, UploadCloud } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type VerificationContext = {
  allowed: boolean
  can_sell: boolean
  email_confirmed: boolean
  kyc_status: string
  kyb_status: string
  store_verified: boolean
  risk_blocked: boolean
  role: string
  plan_code: string
  next_action: string
}

type UploadResult = { type: string; path: string; mime_type: string; size_bytes: number }

const labels: Record<string, string> = {
  not_started: "No iniciada", pending: "Pendiente", submitted: "Enviada", in_review: "En revisión",
  additional_information: "Información adicional requerida", approved: "Aprobada", rejected: "Rechazada",
  expired: "Vencida", suspended: "Suspendida",
}

const REQUIRED_FILES = [
  { type: "id_front", label: "Documento — frente", accept: "image/jpeg,image/png,image/webp,application/pdf" },
  { type: "id_back", label: "Documento — reverso", accept: "image/jpeg,image/png,image/webp,application/pdf" },
  { type: "profile_photo", label: "Foto de perfil", accept: "image/jpeg,image/png,image/webp" },
  { type: "left_photo", label: "Foto lateral izquierda", accept: "image/jpeg,image/png,image/webp" },
  { type: "right_photo", label: "Foto lateral derecha", accept: "image/jpeg,image/png,image/webp" },
] as const

export default function VerificationCenter() {
  const supabase = useMemo(() => createClient(), [])
  const [data, setData] = useState<VerificationContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [country, setCountry] = useState("")
  const [documentType, setDocumentType] = useState("id_card")
  const [documentNumber, setDocumentNumber] = useState("")
  const [files, setFiles] = useState<Record<string, File | null>>({})

  useEffect(() => {
    fetch("/api/b2b/access", { cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error("No fue posible consultar tu estado de verificación."); return response.json() as Promise<VerificationContext> })
      .then(setData)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "No fue posible consultar el estado."))
      .finally(() => setLoading(false))
  }, [])

  async function uploadFile(file: File, type: string): Promise<UploadResult> {
    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (authError || !auth.user) throw new Error("Debes iniciar sesión para completar la verificación.")
    if (file.size <= 0 || file.size > 20 * 1024 * 1024) throw new Error("Cada archivo debe pesar entre 1 byte y 20 MB.")
    const { data: signed, error: signedError } = await supabase.functions.invoke("kyc-upload", { body: { fileName: file.name, contentType: file.type, fileSize: file.size } })
    if (signedError || !signed?.path || !signed?.token || !signed?.bucket) throw new Error(signed?.error || signedError?.message || "No fue posible preparar la carga segura.")
    const { error: uploadError } = await supabase.storage.from(String(signed.bucket)).uploadToSignedUrl(String(signed.path), String(signed.token), file, { contentType: file.type, upsert: false })
    if (uploadError) throw new Error(uploadError.message || "No fue posible cargar el archivo.")
    return { type, path: String(signed.path), mime_type: file.type || "application/octet-stream", size_bytes: file.size }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setSuccess(null)
    const missing = REQUIRED_FILES.filter((item) => !files[item.type])
    if (!country || !/^[A-Z]{2}$/.test(country)) return setError("El país es obligatorio.")
    if (!documentNumber.trim()) return setError("El número de documento es obligatorio.")
    if (missing.length) return setError(`Faltan archivos obligatorios: ${missing.map((item) => item.label).join(", ")}.`)
    setSubmitting(true)
    try {
      const uploaded: UploadResult[] = []
      for (const item of REQUIRED_FILES) uploaded.push(await uploadFile(files[item.type]!, item.type))
      const { data: caseId, error: submitError } = await supabase.rpc("submit_kyc_identity", { p_country: country, p_document_type: documentType, p_document_number: documentNumber.trim(), p_documents: uploaded })
      if (submitError) throw new Error(submitError.message || "No fue posible registrar la verificación.")
      setSuccess(`Solicitud de verificación enviada correctamente. Caso: ${String(caseId)}`)
      setData((current) => current ? { ...current, kyc_status: "submitted", next_action: "in_review" } : current)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "No fue posible completar la verificación.")
    } finally { setSubmitting(false) }
  }

  if (loading) return <main className="mx-auto max-w-4xl px-4 py-12"><div className="h-48 animate-pulse rounded-3xl bg-muted" /></main>
  if (error && !data) return <main className="mx-auto max-w-4xl px-4 py-12"><div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-muted-foreground">{error}</div></main>

  const seller = data ? ["vendor", "company", "professional", "admin"].includes(data.role) : false
  const identityOk = !!data && data.email_confirmed && data.kyc_status === "approved"
  const businessOk = !seller || (!!data && data.kyb_status === "approved" && data.store_verified)

  return (
    <main className="min-h-screen bg-transparent px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="marketplace-card rounded-[2rem] p-7 shadow-marketplace-lg sm:p-10">
          <p className="text-xs font-black uppercase tracking-[.18em] text-primary">Credi Trust Center</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-5xl">Centro de verificación</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">Identidad y seguridad empresarial para operar en Credi Marketplace. La información y los archivos de verificación se gestionan como evidencia privada.</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="marketplace-card rounded-3xl p-6"><div className="flex items-center gap-3"><ShieldCheck className="size-6 text-primary" /><h2 className="text-lg font-black text-foreground">Identidad</h2></div><p className="mt-3 text-sm text-muted-foreground">Correo confirmado + KYC aprobado.</p><div className="mt-5 flex items-center gap-2 text-sm font-bold">{identityOk ? <CheckCircle2 className="size-5 text-emerald-500" /> : <CircleAlert className="size-5 text-amber-500" />} {data?.email_confirmed ? "Correo confirmado" : "Correo pendiente"} · {labels[data?.kyc_status ?? "not_started"] ?? data?.kyc_status}</div></article>
          <article className="marketplace-card rounded-3xl p-6"><div className="flex items-center gap-3"><ShieldCheck className="size-6 text-primary" /><h2 className="text-lg font-black text-foreground">Empresa</h2></div><p className="mt-3 text-sm text-muted-foreground">Los perfiles comerciales requieren KYB y tienda verificada.</p><div className="mt-5 flex items-center gap-2 text-sm font-bold">{businessOk ? <CheckCircle2 className="size-5 text-emerald-500" /> : <CircleAlert className="size-5 text-amber-500" />} {seller ? `${labels[data?.kyb_status ?? "not_started"] ?? data?.kyb_status} · ${data?.store_verified ? "Tienda verificada" : "Tienda pendiente"}` : "No requerida para esta cuenta"}</div></article>
        </section>

        {data?.kyc_status !== "approved" && (
          <form onSubmit={submit} className="marketplace-card rounded-[2rem] p-6 shadow-marketplace-lg sm:p-8">
            <div className="flex items-start gap-3"><FileCheck2 className="mt-1 size-6 shrink-0 text-primary" /><div><h2 className="text-2xl font-black text-foreground">Completar verificación de identidad</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Todos los campos y archivos de este formulario son obligatorios para enviar la solicitud.</p></div></div>
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-bold text-foreground">País <span className="text-destructive">*</span><select required value={country} onChange={(e) => setCountry(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3"><option value="">Seleccionar país</option><option value="US">Estados Unidos</option><option value="VE">Venezuela</option><option value="CO">Colombia</option><option value="MX">México</option><option value="ES">España</option><option value="PA">Panamá</option><option value="DO">República Dominicana</option></select></label>
              <label className="text-sm font-bold text-foreground">Tipo de documento <span className="text-destructive">*</span><select required value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3"><option value="id_card">Documento de identidad</option><option value="passport">Pasaporte</option><option value="drivers_license">Licencia de conducir</option></select></label>
              <label className="text-sm font-bold text-foreground sm:col-span-2">Número de documento <span className="text-destructive">*</span><input required minLength={3} maxLength={80} value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3" placeholder="Número exacto del documento" /></label>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {REQUIRED_FILES.map((item) => <label key={item.type} className="cursor-pointer rounded-2xl border border-dashed border-border bg-background/70 p-5 transition hover:border-primary/60 hover:bg-primary/5"><div className="flex items-center gap-3"><UploadCloud className="size-5 text-primary" /><span className="text-sm font-black text-foreground">{item.label} <span className="text-destructive">*</span></span></div><input required type="file" accept={item.accept} onChange={(e) => setFiles((current) => ({ ...current, [item.type]: e.target.files?.[0] ?? null }))} className="mt-4 block w-full text-xs text-muted-foreground" /><span className="mt-2 block text-xs text-muted-foreground">JPG, PNG o PDF · máximo 20 MB</span>{files[item.type] && <span className="mt-2 block truncate text-xs font-bold text-emerald-600">✓ {files[item.type]!.name}</span>}</label>)}
            </div>
            <label className="mt-7 flex items-start gap-3 rounded-2xl border border-border bg-background/60 p-4 text-sm text-muted-foreground"><input required type="checkbox" className="mt-1 size-4" /> <span>Declaro que los datos aportados son correctos y autorizo a Credi Marketplace a utilizarlos exclusivamente para la verificación de identidad y seguridad de la cuenta. <strong className="text-foreground">*</strong></span></label>
            {error && <div className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm font-semibold text-destructive">{error}</div>}
            {success && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{success}</div>}
            <button disabled={submitting} type="submit" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60">{submitting ? <><Loader2 className="size-4 animate-spin" /> Enviando verificación…</> : "Enviar verificación"}</button>
          </form>
        )}

        <section className={`rounded-3xl border p-6 shadow-sm ${data?.risk_blocked ? "border-destructive/20 bg-destructive/5" : "border-emerald-200 bg-emerald-50/80"}`}><h2 className="text-lg font-black text-foreground">Monitoreo de riesgo</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Credi puede poner una operación en revisión cuando los controles de riesgo, AML, PEP o sanciones requieran validación humana.</p><p className="mt-4 text-sm font-black">Estado: {data?.risk_blocked ? "REVISIÓN REQUERIDA" : "SIN ALERTAS ACTIVAS"}</p></section>
        <div className="flex flex-wrap gap-3"><Link href="/compras-mayoristas" className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground">Volver a B2B</Link><Link href="/pricing" className="rounded-xl border border-border px-5 py-3 text-sm font-black text-foreground">Ver planes</Link></div>
      </div>
    </main>
  )
}
