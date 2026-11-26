import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import FollowCreatorButton from '@/components/creators/FollowCreatorButton'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = await params
  const handle = raw.trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9_]{2,29}$/.test(handle)) return { title: 'Creador no encontrado | Credi' }

  const supabase = await createClient()
  const { data } = await supabase.from('creator_profiles')
    .select('display_name,bio')
    .eq('handle', handle)
    .eq('is_published', true)
    .maybeSingle()

  return {
    title: data ? `${data.display_name} (@${handle}) | Credi` : 'Creador no encontrado | Credi',
    description: data?.bio || 'Perfil de creador en Credi Marketplace.',
  }
}

export default async function CreatorProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = await params
  const handle = raw.trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9_]{2,29}$/.test(handle)) notFound()

  const supabase = await createClient()
  const [{ data: profile, error }, { data: { user } }] = await Promise.all([
    supabase.from('creator_profiles')
      .select('user_id,handle,display_name,bio,category,avatar_url,cover_url,website_url,links,visibility,allow_followers')
      .eq('handle', handle)
      .eq('is_published', true)
      .maybeSingle(),
    supabase.auth.getUser(),
  ])

  if (error || !profile || (profile.visibility === 'private' && profile.user_id !== user?.id)) notFound()
  const isOwner = profile.user_id === user?.id

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)]">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/creadores" className="text-sm font-bold text-[var(--primary)]">← Directorio de creadores</Link>
        <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="h-36 bg-gradient-to-r from-sky-900 via-indigo-900 to-violet-900 sm:h-52" />
          <div className="p-6 sm:p-9">
            <p className="text-sm font-bold text-[var(--muted)]">@{profile.handle}</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">{profile.display_name}</h1>
            {profile.category && <p className="mt-2 text-sm font-bold text-[var(--primary)]">{profile.category}</p>}
            <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">{profile.bio || 'Este creador todavía no ha añadido una presentación.'}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {!isOwner && <FollowCreatorButton handle={profile.handle} allowFollowers={profile.allow_followers && profile.visibility === 'public'} />}
              {isOwner && <Link href="/creadores" className="inline-flex min-h-10 items-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-bold">Editar mi perfil</Link>}
              {profile.website_url && <a href={profile.website_url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-bold">Sitio web ↗</a>}
            </div>
          </div>
        </section>
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-black">Contenido y actividad</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">El perfil está conectado a la identidad Credi. El feed de creador, las métricas de audiencia y las herramientas de monetización se conectarán en la siguiente fase.</p>
        </section>
      </div>
    </main>
  )
}
