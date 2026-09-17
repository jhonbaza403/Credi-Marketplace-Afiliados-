'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { FileText, LogOut, Package, PenLine, Settings, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Post = { id: string; title: string | null; body: string | null; media: unknown; created_at: string; status: string }

function firstMedia(media: unknown) {
  if (!Array.isArray(media)) return null
  const item = media[0] as { url?: string; type?: string } | undefined
  return item?.url ? { url: item.url, type: item.type || '' } : null
}

export default function AccountCenter() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [name, setName] = useState('')
  const [posts, setPosts] = useState<Post[]>([])
  const [postCount, setPostCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (!active) return
        if (userError || !user) { setLoading(false); return }
        setUserId(user.id)
        setUserEmail(user.email ?? '')
        const [{ data: profile }, { data: ownPosts, count }] = await Promise.all([
          supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
          supabase.from('feed_posts').select('id,title,body,media,created_at,status', { count: 'exact' }).eq('owner_id', user.id).order('created_at', { ascending: false }).limit(20),
        ])
        if (!active) return
        setName(profile?.full_name ?? user.user_metadata?.full_name ?? '')
        setPosts((ownPosts ?? []) as Post[])
        setPostCount(count ?? ownPosts?.length ?? 0)
      } catch (error: unknown) {
        if (active) setMessage(error instanceof Error ? error.message : 'No fue posible cargar tu muro.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [supabase])

  async function saveProfile() {
    if (!userId) return
    setSaving(true); setMessage(null)
    try {
      const { error } = await supabase.from('profiles').update({ full_name: name.trim() || null }).eq('id', userId)
      if (error) throw error
      setMessage('Perfil actualizado correctamente.')
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : 'No fue posible actualizar el perfil.') }
    finally { setSaving(false) }
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/')
    router.refresh()
  }

  if (loading) return <main className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-muted-foreground">Cargando tu muro…</main>
  if (!userEmail) return <main className="mx-auto max-w-3xl px-4 py-16"><section className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm sm:p-10"><UserRound className="mx-auto size-10 text-primary" /><p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-primary">Muro personal</p><h1 className="mt-2 text-3xl font-black text-foreground">Inicia sesión para entrar</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Tu muro contiene tu perfil, publicaciones y actividad privada.</p><Link href="/login?next=/muro" className="mt-7 inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground">Ingresar</Link></section></main>

  return (
    <main className="min-h-screen bg-background px-3 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-marketplace-lg">
          <div className="h-28 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,.35),transparent_35%),linear-gradient(135deg,#08111f,#111827)] sm:h-40" />
          <div className="-mt-10 px-5 pb-6 sm:-mt-14 sm:px-8 sm:pb-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4"><div className="flex size-20 shrink-0 items-center justify-center rounded-3xl border-4 border-card bg-primary/10 text-2xl font-black text-primary sm:size-28">{(name || userEmail).slice(0, 1).toUpperCase()}</div><div className="pb-1"><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Mi Muro</p><h1 className="text-2xl font-black text-foreground sm:text-3xl">{name || 'Usuario Credi'}</h1><p className="text-sm text-muted-foreground">{userEmail}</p></div></div>
              <div className="flex gap-2"><Link href="/publish" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"><PenLine size={16} />Publicar</Link><Link href="/feed" className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground">Ver Feed</Link></div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat icon={<FileText size={16} />} label="Publicaciones" value={postCount} /><Stat icon={<Package size={16} />} label="Pedidos" value="—" /><Stat icon={<UserRound size={16} />} label="Perfil" value="Activo" /><Stat icon={<Settings size={16} />} label="Cuenta" value="Privada" /></div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-xl font-black text-foreground">Mis publicaciones</h2><Link href="/publish" className="text-sm font-bold text-primary">Nueva publicación</Link></div>
            {posts.length ? posts.map((post) => { const media = firstMedia(post.media); return <article key={post.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">{media?.url && media.type.startsWith('video') ? <video className="max-h-96 w-full bg-black object-contain" controls preload="metadata" src={media.url} /> : media?.url ? <img src={media.url} alt="" className="max-h-96 w-full object-cover" loading="lazy" /> : null}<div className="p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-black text-foreground">{post.title || 'Publicación'}</h3><span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">{post.status}</span></div>{post.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{post.body}</p>}<p className="mt-4 text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' })}</p></div></article> }) : <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center"><FileText className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-bold text-foreground">Todavía no tienes publicaciones</p><p className="mt-1 text-sm text-muted-foreground">Publica contenido para que aparezca aquí y, cuando corresponda, en el Feed.</p><Link href="/publish" className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Crear publicación</Link></div>}
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm"><h2 className="font-black text-foreground">Datos del perfil</h2><label className="mt-4 block text-sm font-semibold">Nombre público<input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/30" /></label><label className="mt-4 block text-sm font-semibold">Correo<input readOnly value={userEmail} className="mt-2 w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm" /></label>{message && <p role="status" aria-live="polite" className="mt-4 rounded-xl bg-muted p-3 text-sm">{message}</p>}<button type="button" disabled={saving} onClick={() => void saveProfile()} className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar cambios'}</button></section>
            <button type="button" onClick={() => void signOut()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground hover:bg-muted"><LogOut size={16} />Cerrar sesión</button>
          </aside>
        </div>
      </div>
    </main>
  )
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return <div className="rounded-2xl border border-border bg-background p-4"><div className="flex items-center gap-2 text-primary">{icon}<span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</span></div><p className="mt-2 text-xl font-black text-foreground">{value}</p></div>
}
