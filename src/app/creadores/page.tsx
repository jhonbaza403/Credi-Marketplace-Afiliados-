import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CreatorProfileForm from '@/components/creators/CreatorProfileForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Creadores | Credi Marketplace',
  description: 'Perfiles de creadores dentro de la comunidad Credi.',
}

export default async function CreatorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [publicProfiles, ownProfile] = await Promise.all([
    supabase.from('creator_profiles')
      .select('handle,display_name,bio,category,avatar_url,visibility')
      .eq('is_published', true)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(60),
    user
      ? supabase.from('creator_profiles')
          .select('handle,display_name,bio,category,visibility,is_published,allow_followers')
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 sm:p-10">
          <p className="text-xs font-black uppercase tracking-[.2em] text-[var(--primary)]">Pilar social</p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">Creadores Credi</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">Una identidad Credi, un perfil público de creador y la posibilidad de conectar contenido con productos, comunidad y comercio.</p>
        </header>

        {user ? (
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.7fr)]">
            <CreatorProfileForm initial={ownProfile.data} />
            <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="font-black">Tu perfil de creador</h2>
              {ownProfile.data ? (
                <>
                  <p className="mt-2 text-sm text-[var(--muted)]">Estado: {ownProfile.data.is_published ? 'Publicado' : 'Borrador'} · Visibilidad: {ownProfile.data.visibility}</p>
                  <Link href={`/creadores/${encodeURIComponent(ownProfile.data.handle)}`} className="mt-4 inline-flex min-h-10 items-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-bold">Ver perfil público</Link>
                </>
              ) : (
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Aún no tienes un perfil de creador. Puedes crearlo sin cambiar tu rol ni abrir otra cuenta.</p>
              )}
            </aside>
          </section>
        ) : (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-sm text-[var(--muted)]">Inicia sesión para crear tu perfil y seguir a otros creadores.</p>
            <Link href="/login?next=%2Fcreadores" className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-black text-white">Iniciar sesión</Link>
          </section>
        )}

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Descubre creadores</h2>
            <span className="text-xs text-[var(--muted)]">{publicProfiles.data?.length ?? 0} perfiles públicos</span>
          </div>
          {publicProfiles.error ? (
            <p role="status" className="rounded-2xl border border-[var(--border)] p-4 text-sm">No fue posible cargar el directorio en este momento.</p>
          ) : publicProfiles.data?.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {publicProfiles.data.map((profile) => (
                <Link key={profile.handle} href={`/creadores/${encodeURIComponent(profile.handle)}`} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--primary)]">
                  <p className="text-xs font-bold text-[var(--muted)]">@{profile.handle}</p>
                  <h3 className="mt-2 text-lg font-black">{profile.display_name}</h3>
                  {profile.category && <p className="mt-1 text-xs font-bold text-[var(--primary)]">{profile.category}</p>}
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{profile.bio || 'Creador de la comunidad Credi.'}</p>
                  <span className="mt-4 inline-flex text-sm font-bold text-[var(--primary)]">Ver perfil →</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">Todavía no hay perfiles públicos. Puedes ser de los primeros en publicar uno.</p>
          )}
        </section>
      </div>
    </main>
  )
}
