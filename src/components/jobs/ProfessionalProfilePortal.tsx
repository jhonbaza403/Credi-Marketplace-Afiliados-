'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BriefcaseBusiness, Save, ShieldCheck } from 'lucide-react'
import CrediServicePortalNav from '@/components/portal/CrediServicePortalNav'

type Profile = {
  full_name: string | null
  headline: string | null
  summary: string | null
  location: string | null
  skills: string[]
  website_url: string | null
  portfolio_url: string | null
  visibility: 'private' | 'public'
}

const emptyProfile: Profile = {
  full_name: '', headline: '', summary: '', location: '', skills: [],
  website_url: '', portfolio_url: '', visibility: 'private',
}

export default function ProfessionalProfilePortal() {
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    void fetch('/api/jobs/profile', { cache: 'no-store' })
      .then(async response => {
        const body = await response.json()
        if (response.status === 401) {
          window.location.assign('/login?next=' + encodeURIComponent('/jobs/profile'))
          return
        }
        if (!response.ok) throw new Error(body.error || 'No fue posible cargar tu perfil.')
        if (active && body.profile) setProfile({
          full_name: body.profile.full_name ?? '',
          headline: body.profile.headline ?? '',
          summary: body.profile.summary ?? '',
          location: body.profile.location ?? '',
          skills: body.profile.skills ?? [],
          website_url: body.profile.website_url ?? '',
          portfolio_url: body.profile.portfolio_url ?? '',
          visibility: body.profile.visibility ?? 'private',
        })
      })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'No fue posible cargar tu perfil.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile(current => ({ ...current, [key]: value }))
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/jobs/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const body = await response.json()
      if (response.status === 401) {
        window.location.assign('/login?next=' + encodeURIComponent('/jobs/profile'))
        return
      }
      if (!response.ok) throw new Error(body.error || 'No fue posible guardar el perfil.')
      setMessage('Tu perfil profesional quedó guardado.')
      setProfile(current => ({ ...current, ...body.profile }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible guardar el perfil.')
    } finally { setSaving(false) }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <CrediServicePortalNav />
        <Link href="/jobs" className="inline-flex items-center gap-2 text-sm font-black text-primary"><ArrowLeft className="size-4" /> Volver a empleos</Link>
        <header className="rounded-[2rem] border border-border bg-card p-7 shadow-sm sm:p-9">
          <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-primary"><BriefcaseBusiness className="size-4" /> Credi Professional Identity</span>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">Mi perfil profesional</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Presenta tu experiencia y habilidades. El perfil es privado de forma predeterminada; tú decides cuándo hacerlo público.</p>
        </header>
        {loading ? <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Cargando perfil…</p> : null}
        {error ? <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p> : null}
        {message ? <p role="status" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700">{message}</p> : null}
        <form onSubmit={save} className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-bold text-muted-foreground">Nombre profesional
              <input value={profile.full_name ?? ''} onChange={e => update('full_name', e.target.value)} maxLength={150} className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground" />
            </label>
            <label className="text-xs font-bold text-muted-foreground">Titular profesional
              <input value={profile.headline ?? ''} onChange={e => update('headline', e.target.value)} maxLength={180} placeholder="Ej. Ingeniero de software · Gestión de proyectos" className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground" />
            </label>
            <label className="text-xs font-bold text-muted-foreground">Ubicación o disponibilidad
              <input value={profile.location ?? ''} onChange={e => update('location', e.target.value)} maxLength={180} placeholder="Ej. Remoto · América" className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground" />
            </label>
            <label className="text-xs font-bold text-muted-foreground">Habilidades (separadas por coma)
              <input value={Array.isArray(profile.skills) ? profile.skills.join(', ') : ''} onChange={e => update('skills', e.target.value.split(',').map(v => v.trim()).filter(Boolean))} className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground" />
            </label>
          </div>
          <label className="block text-xs font-bold text-muted-foreground">Resumen profesional
            <textarea value={profile.summary ?? ''} onChange={e => update('summary', e.target.value)} maxLength={5000} rows={6} className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm leading-6 text-foreground" />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-bold text-muted-foreground">Sitio web
              <input type="url" value={profile.website_url ?? ''} onChange={e => update('website_url', e.target.value)} placeholder="https://" className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground" />
            </label>
            <label className="text-xs font-bold text-muted-foreground">Portafolio
              <input type="url" value={profile.portfolio_url ?? ''} onChange={e => update('portfolio_url', e.target.value)} placeholder="https://" className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground" />
            </label>
          </div>
          <label className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4 text-sm">
            <input type="checkbox" checked={profile.visibility === 'public'} onChange={e => update('visibility', e.target.checked ? 'public' : 'private')} className="mt-1 size-4" />
            <span><strong className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Hacer público mi perfil profesional</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">Si lo activas, los campos profesionales guardados podrán ser consultados por usuarios autenticados. No publiques datos personales que no quieras compartir.</span></span>
          </label>
          <div className="flex justify-end border-t border-border pt-5">
            <button disabled={saving || loading} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground disabled:opacity-50"><Save className="size-4" />{saving ? 'Guardando…' : 'Guardar perfil'}</button>
          </div>
        </form>
      </div>
    </main>
  )
}
