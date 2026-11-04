'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { BriefcaseBusiness, MapPin, Search, Sparkles, UserRound, Building2, Clock3 } from 'lucide-react'
import CrediServicePortalNav from '@/components/portal/CrediServicePortalNav'

type Job = {
  id: string
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

const modeLabels: Record<string, string> = { remote: 'Remoto', hybrid: 'Híbrido', on_site: 'Presencial' }
const typeLabels: Record<string, string> = {
  full_time: 'Tiempo completo', part_time: 'Medio tiempo', contract: 'Contrato',
  temporary: 'Temporal', internship: 'Pasantía', freelance: 'Freelance',
}

export default function JobsPortal() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load(nextQuery = query, nextLocation = location) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (nextQuery.trim()) params.set('q', nextQuery.trim())
      if (nextLocation.trim()) params.set('location', nextLocation.trim())
      const response = await fetch('/api/jobs?' + params.toString(), { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'No fue posible cargar las oportunidades.')
      setJobs(Array.isArray(body.jobs) ? body.jobs : [])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar las oportunidades.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void load('', '') }, [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void load(query, location)
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <CrediServicePortalNav />
        <header className="relative isolate overflow-hidden rounded-[2rem] bg-[linear-gradient(125deg,#07152a_0%,#17153c_58%,#10333d_100%)] p-7 text-white shadow-[0_26px_80px_rgba(2,8,28,.25)] sm:p-10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-cyan-300/15 blur-3xl" />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-white/[.07] px-3 py-1.5 text-xs font-black uppercase tracking-[.18em] text-cyan-100">
                <BriefcaseBusiness className="size-4" /> Credi Professional Network
              </span>
              <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">Talento, empresas y nuevas oportunidades.</h1>
              <p className="mt-4 text-sm leading-7 text-slate-200 sm:text-base">
                Encuentra empleos, conecta con empresas y presenta tu perfil profesional desde el mismo ecosistema social y comercial de Credi.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/jobs/create" className="rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950">Publicar vacante</Link>
              <Link href="/jobs/profile" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[.07] px-4 py-3 text-sm font-black text-white">
                <UserRound className="size-4" /> Mi perfil profesional
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="text-xs font-bold text-muted-foreground">
              Cargo, empresa o habilidad
              <span className="relative mt-1.5 block">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Ej. Diseño, ventas, ingeniería…" className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary" />
              </span>
            </label>
            <label className="text-xs font-bold text-muted-foreground">
              Ubicación o modalidad
              <span className="relative mt-1.5 block">
                <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <input value={location} onChange={event => setLocation(event.target.value)} placeholder="Ej. Remoto, Caracas, Miami…" className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary" />
              </span>
            </label>
            <button type="submit" disabled={loading} className="self-end rounded-xl bg-primary px-6 py-3 text-sm font-black text-primary-foreground disabled:opacity-50">Buscar oportunidades</button>
          </form>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.18em] text-primary">Oportunidades publicadas</p>
              <h2 className="mt-1 text-2xl font-black">Empleos y proyectos</h2>
            </div>
            <p className="text-xs text-muted-foreground">{loading ? 'Actualizando…' : jobs.length + ' oportunidades'}</p>
          </div>
          {error ? <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p> : null}
          {loading ? <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">Cargando oportunidades…</div> : null}
          {!loading && !error && jobs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
              <Sparkles className="mx-auto size-8 text-primary" />
              <h3 className="mt-3 text-lg font-black">Todavía no hay vacantes para estos criterios</h3>
              <p className="mt-2 text-sm text-muted-foreground">Prueba otra búsqueda o comparte la primera oportunidad profesional de Credi.</p>
              <Link href="/jobs/create" className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground">Publicar una vacante</Link>
            </div>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-2">
            {jobs.map(job => (
              <article key={job.id} className="rounded-3xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Building2 className="size-6" /></span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-black leading-tight">{job.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">{job.company}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-muted-foreground">
                      <span className="rounded-full bg-muted px-2.5 py-1">{modeLabels[job.work_mode] || job.work_mode}</span>
                      <span className="rounded-full bg-muted px-2.5 py-1">{typeLabels[job.employment_type] || job.employment_type}</span>
                      {job.category ? <span className="rounded-full bg-muted px-2.5 py-1">{job.category}</span> : null}
                    </div>
                  </div>
                </div>
                <p className="mt-4 line-clamp-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{job.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  {job.location || job.country ? <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{[job.location, job.country].filter(Boolean).join(', ')}</span> : null}
                  <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" />{new Date(job.created_at).toLocaleDateString('es-ES')}</span>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
                  <p className="text-sm font-black">{job.salary || (job.salary_min !== null || job.salary_max !== null ? [job.salary_min, job.salary_max].filter(v => v !== null).join(' – ') + ' ' + job.salary_currency : 'Remuneración a convenir')}</p>
                  <Link href={'/jobs/' + job.id} className="rounded-xl border border-primary/30 px-4 py-2.5 text-xs font-black text-primary hover:bg-primary/5">Ver oportunidad</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
