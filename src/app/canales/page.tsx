import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CreateChannelForm from '@/components/channels/CreateChannelForm'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Canales de difusión | Credi Marketplace',
  description: 'Canales de difusión, comunidades y actualizaciones de Credi.',
}

export default async function ChannelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [publicResult, ownResult] = await Promise.all([
    supabase.from('broadcast_channels')
      .select('id,handle,title,description,owner_id,visibility,join_policy,created_at')
      .eq('status', 'active')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(60),
    user
      ? supabase.from('broadcast_channels')
          .select('id,handle,title,description,owner_id,visibility,join_policy,created_at')
          .eq('owner_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(40)
      : Promise.resolve({ data: [], error: null }),
  ])

  const byId = new Map<string, NonNullable<typeof publicResult.data>[number]>()
  for (const channel of [...(publicResult.data ?? []), ...(ownResult.data ?? [])]) byId.set(channel.id, channel)
  const channels = Array.from(byId.values()).sort((a, b) => b.created_at.localeCompare(a.created_at))

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 sm:p-10">
          <p className="text-xs font-black uppercase tracking-[.2em] text-[var(--primary)]">Mensajería Credi</p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">Canales de difusión</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">Publica actualizaciones para tus suscriptores y conecta mensajes con productos del catálogo Credi sin copiar inventario ni crear un catálogo paralelo.</p>
        </header>

        {user ? <CreateChannelForm /> : (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm">
            <p className="text-[var(--muted)]">Inicia sesión para crear canales y suscribirte a ellos.</p>
            <Link href="/login?next=%2Fcanales" className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-[var(--primary)] px-4 py-2 font-black text-white">Iniciar sesión</Link>
          </div>
        )}

        <section>
          <h2 className="mb-4 text-xl font-black">Canales públicos y tus canales</h2>
          {publicResult.error || ownResult.error ? (
            <p role="status" className="rounded-2xl border border-[var(--border)] p-4 text-sm">No fue posible cargar los canales.</p>
          ) : channels.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {channels.map((channel) => (
                <Link key={channel.id} href={`/canales/${encodeURIComponent(channel.handle)}`} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--primary)]">
                  <p className="text-xs font-bold text-[var(--muted)]">@{channel.handle} · {channel.visibility}</p>
                  <h3 className="mt-2 text-lg font-black">{channel.title}</h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{channel.description || 'Canal de difusión de Credi.'}</p>
                  <span className="mt-4 inline-flex text-sm font-bold text-[var(--primary)]">Abrir canal →</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">Todavía no hay canales públicos. Crea el primero para empezar a compartir actualizaciones.</p>
          )}
        </section>
      </div>
    </main>
  )
}
