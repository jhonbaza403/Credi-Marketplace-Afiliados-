import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowLeft, ExternalLink, Sparkles } from 'lucide-react'
import CrediServicePortalNav from '@/components/portal/CrediServicePortalNav'

export function ModuleShell({ eyebrow, title, description, icon, endpoint, children }: { eyebrow: string; title: string; description: string; icon: ReactNode; endpoint?: string; children?: ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <CrediServicePortalNav />
        <Link href="/ecosistema-avanzado" className="inline-flex items-center gap-2 text-sm font-black text-primary hover:underline">
          <ArrowLeft className="size-4" /> Volver al ecosistema
        </Link>
        <section className="relative isolate overflow-hidden rounded-[2rem] border border-indigo-300/15 bg-[linear-gradient(125deg,#081326_0%,#17163a_58%,#10333d_100%)] p-7 text-white shadow-[0_26px_80px_rgba(2,8,28,.24)] sm:p-10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-cyan-300/15 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/4 size-72 rounded-full bg-violet-400/15 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/15 bg-white/[.08] text-cyan-100">
              {icon}
            </div>
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-100">
                <Sparkles className="size-3.5" aria-hidden="true" /> {eyebrow}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">{description}</p>
              {endpoint ? (
                <a href={endpoint} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[.06] px-3 py-2 text-xs font-black text-white hover:bg-white/[.12]">
                  API / endpoint <ExternalLink className="size-3.5" />
                </a>
              ) : null}
            </div>
          </div>
        </section>
        {children ? (
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            {children}
          </section>
        ) : null}
      </div>
    </main>
  )
}
