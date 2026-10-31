'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BriefcaseBusiness, Building2, MapPin, Send, ShieldCheck } from 'lucide-react'
import CrediServicePortalNav from '@/components/portal/CrediServicePortalNav'

type Job = {
  id: string
  employer_id: string
  company: string
  title: string
  description: string
  category: string | null
  employment_type: string
  work_mode: string
  country: string | null
  location: string | null
  salary: string | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  created_at: string
}

export default function JobDetailPortal({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<Job | null>(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true
    void fetch('/api/jobs/' + encodeURIComponent(jobId), { cache: 'no-store' })
      .then(async response => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'No se encontró la vacante.')
        if (active) setJob(body.job ?? null)
      })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'No fue posible cargar la vacante.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [jobId])

  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true); setError(''); setSuccess('')
    try {
      const response = await fetch('/api/jobs/' + encodeURIComponent(jobId) + '/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover_letter: coverLetter }),
      })
      const body = await response.json()
      if (response.status === 401) {
        window.location.assign('/login?next=' + encodeURIComponent('/jobs/' + jobId))
        return
      }
      if (!response.ok) throw new Error(body.error || 'No fue posible enviar la postulación.')
      setSuccess('Tu postulación quedó registrada. Puedes consultar su estado desde tu cuenta.')
      setCoverLetter('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible enviar la postulación.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <CrediServicePortalNav />
        <Link href="/jobs" className="inline-flex items-center gap-2 text-sm font-black text-primary"><ArrowLeft className="size-4" /> Volver a oportunidades</Link>
        {loading ? <div className="rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground">Cargando vacante…</div> : null}
        {error && !job ? <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p> : null}
        {job ? (
          <>
            <header className="rounded-[2rem] border border-border bg-card p-7 shadow-sm sm:p-10">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-primary"><BriefcaseBusiness className="size-3.5" /> Oportunidad profesional</span>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{job.title}</h1>
              <p className="mt-3 flex items-center gap-2 text-base font-bold text-muted-foreground"><Building2 className="size-4" /> {job.company}</p>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" /> {[job.location, job.country, job.work_mode].filter(Boolean).join(' · ')}</p>
              <p className="mt-5 text-sm font-black">{job.salary || 'Remuneración a convenir'}</p>
            </header>
            <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
              <article className="rounded-3xl border border-border bg-card p-6 sm:p-8">
                <h2 className="text-xl font-black">Descripción de la oportunidad</h2>
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted-foreground">{job.description}</p>
              </article>
              <aside className="rounded-3xl border border-border bg-card p-6 sm:p-8">
                <div className="flex items-center gap-2 text-sm font-black"><ShieldCheck className="size-5 text-primary" /> Postulación desde Credi</div>
                {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
                {success ? <p role="status" className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700">{success}</p> : null}
                <form onSubmit={apply} className="mt-5 space-y-4">
                  <label className="block text-xs font-bold text-muted-foreground">
                    Carta de presentación (opcional)
                    <textarea value={coverLetter} onChange={event => setCoverLetter(event.target.value)} maxLength={5000} rows={7} placeholder="Cuéntale a la empresa qué experiencia y habilidades aportarías." className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary" />
                  </label>
                  <button disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground disabled:opacity-50"><Send className="size-4" />{saving ? 'Enviando…' : 'Postularme'}</button>
                </form>
                <p className="mt-4 text-[11px] leading-5 text-muted-foreground">Tu postulación se comparte con la cuenta responsable de esta vacante. No envíes información sensible innecesaria.</p>
              </aside>
            </section>
          </>
        ) : null}
      </div>
    </main>
  )
}
