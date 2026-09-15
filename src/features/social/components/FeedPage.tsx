import Link from 'next/link'
import { getDatabaseServerClient } from '@/lib/database/server'
import FeedPostCard from './FeedPostCard'

type MediaItem = { type?: string; url?: string }
type Profile = { id: string; full_name: string | null; avatar_url: string | null }

function mediaItem(media: unknown): MediaItem | null {
  if (!Array.isArray(media)) return null
  const first = media[0] as MediaItem | undefined
  return first?.url && typeof first.url === 'string' ? first : null
}

export default async function FeedPage() {
  const supabase = await getDatabaseServerClient()
  const now = new Date().toISOString()
  const [{ data: auth }] = await Promise.all([supabase.auth.getUser()])
  const [postsResult, storiesResult, reelsResult, adsResult] = await Promise.all([
    supabase.from('feed_posts').select('id,owner_id,title,body,media,published_at,created_at').eq('status', 'published').eq('visibility', 'public').eq('moderation_status', 'approved').order('created_at', { ascending: false }).limit(20),
    supabase.from('stories').select('id,owner_id,body,media,expires_at,created_at').eq('visibility', 'public').gt('expires_at', now).order('created_at', { ascending: false }).limit(20),
    supabase.from('reels').select('id,owner_id,title,body,media,published_at,created_at').eq('status', 'published').eq('visibility', 'public').eq('moderation_status', 'approved').order('created_at', { ascending: false }).limit(20),
    supabase.from('advertisements').select('id,title,body,media,destination_url,starts_at,ends_at,created_at').eq('status', 'active').or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gt.${now}`).order('created_at', { ascending: false }).limit(10),
  ])

  const postIds = (postsResult.data ?? []).map((post) => post.id)
  const ownerIds = [...new Set([
    ...(postsResult.data ?? []).map((post) => post.owner_id),
    ...(storiesResult.data ?? []).map((story) => story.owner_id),
    ...(reelsResult.data ?? []).map((reel) => reel.owner_id),
  ])]
  const [profilesResult, statsResult] = await Promise.all([
    ownerIds.length ? supabase.from('profiles').select('id,full_name,avatar_url').in('id', ownerIds) : Promise.resolve({ data: [], error: null }),
    postIds.length ? supabase.rpc('get_feed_post_stats', { p_post_ids: postIds }) : Promise.resolve({ data: [], error: null }),
  ])
  const profiles = Object.fromEntries(((profilesResult.data ?? []) as Profile[]).map((profile) => [profile.id, profile]))
  const stats = Object.fromEntries(((statsResult.data ?? []) as Array<{ post_id: string; like_count: number; comment_count: number; liked_by_me: boolean }>).map((item) => [item.post_id, item]))

  return (
    <main className="min-h-screen bg-background px-3 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-marketplace-lg sm:p-9">
          <p className="text-xs font-black uppercase tracking-[.2em] text-primary">Red Credi · Feed</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">El contenido que está pasando ahora</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Descubre publicaciones, historias, reels y campañas públicas. El Muro pertenece a cada perfil y el Feed concentra el descubrimiento de la comunidad.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
            <Link href="/feed" className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-primary">Feed</Link>
            <Link href="/muro" className="rounded-full border border-border bg-background px-3 py-1.5 text-muted-foreground hover:text-foreground">Mi Muro</Link>
            <Link href="/publish" className="rounded-full border border-border bg-background px-3 py-1.5 text-muted-foreground hover:text-foreground">Publicar</Link>
          </div>
        </header>

        <section aria-labelledby="stories-title">
          <div className="mb-4 flex items-center justify-between"><h2 id="stories-title" className="text-xl font-black text-foreground">Historias</h2><span className="text-xs text-muted-foreground">24 horas</span></div>
          {storiesResult.error ? <Empty>Las historias no están disponibles ahora.</Empty> : storiesResult.data?.length ? <div className="flex gap-3 overflow-x-auto pb-2 snap-x">{storiesResult.data.map((story) => { const profile = profiles[story.owner_id]; const media = mediaItem(story.media); return <article key={story.id} className="w-40 shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><div className="aspect-[4/5] bg-muted">{media?.url && media.type?.startsWith('video') ? <video className="h-full w-full object-cover" muted playsInline preload="metadata" src={media.url} /> : media?.url ? <img className="h-full w-full object-cover" src={media.url} alt="" loading="lazy" /> : <div className="flex h-full items-end p-4 text-sm font-semibold text-foreground">{story.body || 'Historia de Credi'}</div>}</div><div className="p-3"><p className="truncate text-xs font-black text-foreground">{profile?.full_name || 'Comunidad Credi'}</p><p className="mt-1 text-[10px] text-muted-foreground">Expira {new Date(story.expires_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</p></div></article> })}</div> : <Empty>Aún no hay historias públicas.</Empty>}
        </section>

        <section aria-labelledby="posts-title">
          <div className="mb-4 flex items-center justify-between"><h2 id="posts-title" className="text-xl font-black text-foreground">Publicaciones</h2><span className="text-xs text-muted-foreground">Comunidad Credi</span></div>
          {postsResult.error ? <Empty>Las publicaciones no están disponibles ahora.</Empty> : postsResult.data?.length ? <div className="space-y-5">{postsResult.data.map((post) => { const media = mediaItem(post.media); const profile = profiles[post.owner_id]; const stat = stats[post.id]; return <FeedPostCard key={post.id} postId={post.id} title={post.title} body={post.body} publishedAt={post.published_at || post.created_at} ownerName={profile?.full_name || 'Comunidad Credi'} ownerAvatar={profile?.avatar_url || null} mediaUrl={media?.url || null} mediaType={media?.type || null} initialLikes={Number(stat?.like_count || 0)} initialComments={Number(stat?.comment_count || 0)} initiallyLiked={Boolean(stat?.liked_by_me)} /> })}</div> : <Empty>Aún no hay publicaciones públicas.</Empty>}
        </section>

        <section aria-labelledby="reels-title">
          <div className="mb-4 flex items-center justify-between"><h2 id="reels-title" className="text-xl font-black text-foreground">Reels</h2><span className="text-xs text-muted-foreground">Vídeo</span></div>
          {reelsResult.error ? <Empty>Los reels no están disponibles ahora.</Empty> : reelsResult.data?.length ? <div className="space-y-5">{reelsResult.data.map((reel) => { const media = mediaItem(reel.media); const profile = profiles[reel.owner_id]; return <article key={reel.id} className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-sm"><div className="aspect-[9/16] max-h-[680px] bg-black">{media?.url ? <video className="h-full w-full object-contain" controls playsInline preload="metadata" src={media.url} /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Reel sin multimedia</div>}</div><div className="p-5"><p className="text-xs font-bold text-primary">{profile?.full_name || 'Comunidad Credi'}</p><h3 className="mt-1 font-black text-foreground">{reel.title || 'Reel de la comunidad'}</h3>{reel.body && <p className="mt-2 text-sm leading-6 text-muted-foreground">{reel.body}</p>}</div></article> })}</div> : <Empty>Aún no hay reels públicos.</Empty>}
        </section>

        <section aria-labelledby="ads-title">
          <div className="mb-4 flex items-center justify-between"><h2 id="ads-title" className="text-xl font-black text-foreground">Publicidad</h2><span className="text-xs text-muted-foreground">Anuncios activos</span></div>
          {adsResult.error ? <Empty>La publicidad no está disponible ahora.</Empty> : adsResult.data?.length ? <div className="space-y-4">{adsResult.data.map((ad) => { const media = mediaItem(ad.media); return <article key={ad.id} className="overflow-hidden rounded-3xl border border-primary/20 bg-primary/[.04]">{media?.url && media.type?.startsWith('image') && <img src={media.url} alt="" className="max-h-80 w-full object-cover" loading="lazy" />}<div className="p-6"><p className="text-[11px] font-black uppercase tracking-[.15em] text-primary">Publicidad</p><h3 className="mt-2 text-xl font-black text-foreground">{ad.title}</h3>{ad.body && <p className="mt-2 text-sm leading-6 text-muted-foreground">{ad.body}</p>}{ad.destination_url && <a href={ad.destination_url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Ver anuncio</a>}</div></article> })}</div> : <Empty>No hay campañas publicitarias activas.</Empty>}
        </section>
      </div>
    </main>
  )
}

function Empty({ children }: { children: string }) {
  return <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">{children}</p>
}
