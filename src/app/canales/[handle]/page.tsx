import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SubscribeButton from '@/components/channels/SubscribeButton'
import CreateChannelPostForm from '@/components/channels/CreateChannelPostForm'
import InviteChannelButton from '@/components/channels/InviteChannelButton'
import ManageChannelMembers from '@/components/channels/ManageChannelMembers'
import ChannelRealtimeRefresh from '@/components/channels/ChannelRealtimeRefresh'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = await params
  const handle = raw.trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9_-]{2,39}$/.test(handle)) return { title: 'Canal no encontrado | Credi' }

  const supabase = await createClient()
  const { data } = await supabase.from('broadcast_channels')
    .select('title,description')
    .eq('handle', handle)
    .eq('status', 'active')
    .maybeSingle()

  return {
    title: data ? `${data.title} | Canales Credi` : 'Canal no encontrado | Credi',
    description: data?.description || 'Canal de difusión de Credi Marketplace.',
  }
}

export default async function ChannelPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = await params
  const handle = raw.trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9_-]{2,39}$/.test(handle)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: channel, error } = await supabase.from('broadcast_channels')
    .select('id,owner_id,handle,title,description,visibility,join_policy,status,created_at')
    .eq('handle', handle)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !channel) notFound()
  const isOwner = channel.owner_id === user?.id
  const membership = user
    ? await supabase.from('broadcast_channel_members').select('role,state').eq('channel_id', channel.id).eq('user_id', user.id).maybeSingle()
    : { data: null, error: null }
  const isAdmin = membership.data?.role === 'admin' && membership.data.state === 'active'
  const isManager = isOwner || isAdmin

  const { data: posts, error: postsError } = await supabase.from('broadcast_channel_posts')
    .select('id,body_text,media,product_id,published_at,author_id')
    .eq('channel_id', channel.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50)

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)]">
      <ChannelRealtimeRefresh channelId={channel.id} />
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/canales" className="text-sm font-bold text-[var(--primary)]">← Directorio de canales</Link>
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-9">
          <p className="text-xs font-bold text-[var(--muted)]">@{channel.handle} · {channel.visibility}</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{channel.title}</h1>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">{channel.description || 'Canal de difusión de Credi.'}</p>
          {!isManager && <div className="mt-5"><SubscribeButton channelId={channel.id} /></div>}
          {isManager && <p className="mt-5 text-sm font-semibold text-[var(--primary)]">Tienes permisos para administrar este canal.</p>}
        </section>

        {isManager && channel.visibility === 'private' && channel.join_policy === 'invite_only' && (
          <InviteChannelButton channelId={channel.id} />
        )}
        {isManager && <ManageChannelMembers channelId={channel.id} />}
        {isManager && <CreateChannelPostForm channelId={channel.id} />}

        <section className="space-y-3">
          <h2 className="text-xl font-black">Actualizaciones</h2>
          {postsError ? (
            <p role="status" className="rounded-2xl border border-[var(--border)] p-4 text-sm">No fue posible cargar las actualizaciones.</p>
          ) : posts?.length ? posts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <p className="whitespace-pre-wrap text-sm leading-7">{post.body_text}</p>
              {post.product_id && <Link href={`/products/${encodeURIComponent(post.product_id)}`} className="mt-3 inline-flex text-sm font-bold text-[var(--primary)]">Ver producto relacionado →</Link>}
              <p className="mt-4 text-xs text-[var(--muted)]">{post.published_at ? new Date(post.published_at).toLocaleString('es-ES') : 'Publicación'}</p>
            </article>
          )) : (
            <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">Este canal todavía no tiene actualizaciones.</p>
          )}
        </section>
      </div>
    </main>
  )
}
