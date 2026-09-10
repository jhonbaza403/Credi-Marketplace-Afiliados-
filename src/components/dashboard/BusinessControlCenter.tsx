'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'

const supabase = createClient()

type Product = {
  id: string
  title: string
  price: number
  stock: number
  is_active: boolean
}

type Control = {
  product_id: string
  catalog_visible: boolean
  marketplace_visible: boolean
  b2b_visible: boolean
  feed_visible: boolean
  story_visible: boolean
  sale_enabled: boolean
}

type Catalog = {
  id: string
  name: string
  audience: 'b2c' | 'b2b' | 'both'
  visibility: 'private' | 'profile' | 'marketplace' | 'b2b' | 'public'
  status: 'draft' | 'published' | 'archived'
}

type Workspace = {
  display_name: string
  slug: string | null
}

export default function BusinessControlCenter() {
  const { user, profile, loading: authLoading, isAdmin } = useAuth()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [controls, setControls] = useState<Record<string, Control>>({})
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [selectedCatalog, setSelectedCatalog] = useState('')
  const [catalogItems, setCatalogItems] = useState<Set<string>>(new Set())
  const [catalogName, setCatalogName] = useState('')
  const [catalogAudience, setCatalogAudience] = useState<'b2c' | 'b2b' | 'both'>('b2c')
  const [postText, setPostText] = useState('')
  const [storyText, setStoryText] = useState('')
  const [selectedProductForContent, setSelectedProductForContent] = useState('')
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canManage = Boolean(user) && (isAdmin || ['vendor', 'company', 'professional'].includes(profile?.role ?? ''))

  const load = useCallback(async () => {
    if (!user) return
    setBusy(true)
    setError(null)
    try {
      let { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id,store_name,slug')
        .eq('vendor_id', user.id)
        .maybeSingle()
      if (storeError) throw storeError

      if (!store && canManage) {
        const base = (profile?.fullName || user.email?.split('@')[0] || 'empresa').trim().toLowerCase()
        const slug = `${base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'empresa'}-${user.id.slice(0, 8)}`
        const created = await supabase.from('stores').insert({
          vendor_id: user.id,
          store_name: profile?.fullName ? `${profile.fullName} | Credi` : 'Mi empresa | Credi',
          slug,
          description: 'Empresa en Credi Marketplace',
          is_verified: false,
          is_active: true,
        }).select('id,store_name,slug').single()
        if (created.error) throw created.error
        store = created.data
      }
      if (!store) throw new Error('No existe una empresa operativa asociada a esta cuenta.')

      const [{ data: ws, error: wsError }, { data: productRows, error: productsError }, { data: controlRows, error: controlsError }, { data: catalogRows, error: catalogsError }] = await Promise.all([
        supabase.from('business_workspaces').select('display_name,slug').eq('owner_id', user.id).maybeSingle(),
        supabase.from('products').select('id,title,price,stock,is_active').eq('store_id', store.id).order('created_at', { ascending: false }),
        supabase.from('product_publication_controls').select('product_id,catalog_visible,marketplace_visible,b2b_visible,feed_visible,story_visible,sale_enabled').eq('owner_id', user.id),
        supabase.from('business_catalogs').select('id,name,audience,visibility,status').eq('owner_id', user.id).order('created_at', { ascending: false }),
      ])
      if (wsError) throw wsError
      if (productsError) throw productsError
      if (controlsError) throw controlsError
      if (catalogsError) throw catalogsError

      let nextWorkspace = ws as Workspace | null
      if (!nextWorkspace) {
        const created = await supabase.from('business_workspaces').insert({
          owner_id: user.id,
          default_store_id: store.id,
          display_name: store.store_name,
          slug: store.slug,
        }).select('display_name,slug').single()
        if (created.error) throw created.error
        nextWorkspace = created.data as Workspace
      }

      const nextProducts = (productRows ?? []) as Product[]
      const nextControls: Record<string, Control> = {}
      for (const row of (controlRows ?? []) as Control[]) nextControls[row.product_id] = row
      const missing = nextProducts.filter((product) => !nextControls[product.id])
      if (missing.length) {
        const { data: seeded, error: seedError } = await supabase.from('product_publication_controls').insert(missing.map((product) => ({ product_id: product.id, owner_id: user.id, catalog_visible: false, marketplace_visible: false, b2b_visible: false, feed_visible: false, story_visible: false, sale_enabled: false }))).select('product_id,catalog_visible,marketplace_visible,b2b_visible,feed_visible,story_visible,sale_enabled')
        if (seedError) throw seedError
        for (const row of (seeded ?? []) as Control[]) nextControls[row.product_id] = row
      }

      setWorkspace(nextWorkspace)
      setProducts(nextProducts)
      setControls(nextControls)
      setCatalogs((catalogRows ?? []) as Catalog[])
      const first = (catalogRows ?? [])[0] as Catalog | undefined
      if (first && !selectedCatalog) setSelectedCatalog(first.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible cargar la gestión empresarial.')
    } finally {
      setBusy(false)
    }
  }, [canManage, profile?.fullName, selectedCatalog, user])

  useEffect(() => {
    if (!authLoading && user && canManage) void load()
    if (!authLoading && !user) setBusy(false)
  }, [authLoading, canManage, load, user])

  useEffect(() => {
    if (!selectedCatalog) {
      setCatalogItems(new Set())
      return
    }
    void (async () => {
      const { data, error: itemError } = await supabase.from('business_catalog_items').select('product_id').eq('catalog_id', selectedCatalog).eq('owner_id', user?.id)
      if (itemError) return setError(itemError.message)
      setCatalogItems(new Set((data ?? []).map((row) => row.product_id as string)))
    })()
  }, [selectedCatalog, user?.id])

  const metrics = useMemo(() => {
    const publicCount = products.filter((p) => controls[p.id]?.marketplace_visible).length
    const saleCount = products.filter((p) => controls[p.id]?.sale_enabled).length
    const b2bCount = products.filter((p) => controls[p.id]?.b2b_visible).length
    const low = products.filter((p) => p.stock > 0 && p.stock <= 5).length
    const value = products.reduce((sum, p) => sum + Number(p.price || 0) * Number(p.stock || 0), 0)
    return { total: products.length, publicCount, saleCount, b2bCount, low, value }
  }, [controls, products])

  async function toggle(productId: string, key: keyof Omit<Control, 'product_id'>) {
    const current = controls[productId]
    if (!current) return
    const next = !current[key]
    setMessage(null); setError(null)
    const { error: updateError } = await supabase.from('product_publication_controls').update({ [key]: next }).eq('product_id', productId).eq('owner_id', user?.id)
    if (updateError) return setError(updateError.message)
    setControls((state) => ({ ...state, [productId]: { ...current, [key]: next } }))
    setMessage('Control de publicación actualizado.')
  }

  async function updateStock(productId: string, raw: string) {
    const stock = Number(raw)
    if (!Number.isInteger(stock) || stock < 0) return
    setError(null)
    const { error: productError } = await supabase.from('products').update({ stock }).eq('id', productId)
    if (productError) return setError(productError.message)
    const { error: inventoryError } = await supabase.from('inventory').upsert({ product_id: productId, available_quantity: stock }, { onConflict: 'product_id' })
    if (inventoryError && inventoryError.code !== '42P01') return setError(inventoryError.message)
    setProducts((items) => items.map((p) => p.id === productId ? { ...p, stock } : p))
    setMessage('Inventario actualizado.')
  }

  async function createCatalog() {
    const name = catalogName.trim()
    if (name.length < 2 || !user) return
    setError(null)
    const { data, error: createError } = await supabase.from('business_catalogs').insert({ owner_id: user.id, name, audience: catalogAudience, visibility: 'private', status: 'draft' }).select('id,name,audience,visibility,status').single()
    if (createError) return setError(createError.message)
    setCatalogs((items) => [data as Catalog, ...items])
    setSelectedCatalog(data.id as string)
    setCatalogName('')
    setMessage('Catálogo creado como borrador privado.')
  }

  async function toggleCatalogItem(productId: string) {
    if (!selectedCatalog || !user) return
    const exists = catalogItems.has(productId)
    if (exists) {
      const { error: removeError } = await supabase.from('business_catalog_items').delete().eq('catalog_id', selectedCatalog).eq('product_id', productId).eq('owner_id', user.id)
      if (removeError) return setError(removeError.message)
      setCatalogItems((items) => { const next = new Set(items); next.delete(productId); return next })
    } else {
      const { error: addError } = await supabase.from('business_catalog_items').insert({ catalog_id: selectedCatalog, product_id: productId, owner_id: user.id })
      if (addError) return setError(addError.message)
      setCatalogItems((items) => new Set(items).add(productId))
    }
  }

  async function publishCatalog() {
    if (!selectedCatalog || !user) return
    const { error: updateError } = await supabase.from('business_catalogs').update({ status: 'published', visibility: 'marketplace' }).eq('id', selectedCatalog).eq('owner_id', user.id)
    if (updateError) return setError(updateError.message)
    setCatalogs((items) => items.map((c) => c.id === selectedCatalog ? { ...c, status: 'published', visibility: 'marketplace' } : c))
    setMessage('Catálogo publicado en el Marketplace. Los productos siguen sujetos a sus propios controles.')
  }

  async function createPost() {
    if (!user || postText.trim().length < 2) return
    const { error: postError } = await supabase.from('feed_posts').insert({ owner_id: user.id, body: postText.trim(), product_id: selectedProductForContent || null, catalog_id: selectedCatalog || null, visibility: 'public', status: 'published', published_at: new Date().toISOString(), moderation_status: 'pending' })
    if (postError) return setError(postError.message)
    setPostText(''); setMessage('Publicación creada y enviada a los controles de moderación.')
  }

  async function createStory() {
    if (!user || storyText.trim().length < 2) return
    const { error: storyError } = await supabase.from('stories').insert({ owner_id: user.id, body: storyText.trim(), product_id: selectedProductForContent || null, catalog_id: selectedCatalog || null, visibility: 'public', expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), moderation_status: 'pending' })
    if (storyError) return setError(storyError.message)
    setStoryText(''); setMessage('Historia creada con duración de 24 horas y enviada a moderación.')
  }

  if (authLoading || busy) return <main className="min-h-screen bg-background p-6"><div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center"><div className="text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" /><p className="mt-4 text-sm text-muted-foreground">Cargando centro empresarial…</p></div></div></main>

  if (!user || !canManage) return <main className="min-h-screen bg-background p-6"><div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-10 text-center"><h1 className="text-3xl font-black">Gestión empresarial</h1><p className="mt-3 text-muted-foreground">Esta área está disponible para cuentas comerciales.</p><Link className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground" href="/dashboard/profile">Configurar mi cuenta</Link></div></main>

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
          <div className="bg-gradient-to-br from-primary/[0.12] via-background to-background p-6 sm:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-primary">Centro empresarial</span>
                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{workspace?.display_name || 'Mi empresa'}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Tu inventario es privado. Tú decides qué entra al catálogo, qué sale a la venta, qué se ofrece B2B y qué contenido llega al portal Credi.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/products/create" className="rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground">Nuevo producto</Link>
                <Link href="/chat" className="rounded-xl border border-border bg-background px-4 py-3 text-sm font-black">Credi Business Chat</Link>
                <Link href="/dashboard/orders" className="rounded-xl border border-border bg-background px-4 py-3 text-sm font-black">Pedidos</Link>
              </div>
            </div>
          </div>
        </section>

        {(error || message) && <div className={`mt-5 rounded-2xl border p-4 text-sm ${error ? 'border-destructive/20 bg-destructive/5' : 'border-primary/20 bg-primary/5'}`}>{error || message}</div>}

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Metric label="Inventario" value={metrics.total} />
          <Metric label="Marketplace" value={metrics.publicCount} />
          <Metric label="En venta" value={metrics.saleCount} />
          <Metric label="B2B" value={metrics.b2bCount} />
          <Metric label="Stock bajo" value={metrics.low} />
          <Metric label="Valor stock" value={`$${metrics.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`} />
        </section>

        <section className="mt-7 grid gap-6 xl:grid-cols-[1.6fr_.9fr]">
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-black uppercase tracking-[.18em] text-primary">Control total</p><h2 className="mt-1 text-xl font-black">Inventario y publicación</h2></div>
              <Link href="/products/create" className="rounded-xl border border-border px-4 py-2 text-sm font-bold">Agregar producto</Link>
            </div>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-muted/50"><tr className="border-b border-border">{['Producto','Stock','Catálogo','Marketplace','B2B','Feed','Historia','Venta'].map((head) => <th key={head} className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{head}</th>)}</tr></thead>
                <tbody className="divide-y divide-border">
                  {products.map((product) => {
                    const c = controls[product.id]
                    return <tr key={product.id} className="hover:bg-muted/20">
                      <td className="max-w-[280px] px-4 py-4"><p className="truncate font-bold">{product.title}</p><p className="mt-1 text-xs text-muted-foreground">${Number(product.price).toFixed(2)}</p></td>
                      <td className="px-4 py-4"><input aria-label={`Stock de ${product.title}`} type="number" min="0" value={product.stock} onChange={(e) => void updateStock(product.id, e.target.value)} className="w-24 rounded-lg border border-border bg-background px-2 py-1.5" /></td>
                      {(['catalog_visible','marketplace_visible','b2b_visible','feed_visible','story_visible','sale_enabled'] as const).map((key) => <td key={key} className="px-4 py-4"><button type="button" aria-pressed={Boolean(c?.[key])} onClick={() => void toggle(product.id, key)} className={`rounded-full px-3 py-1 text-xs font-black ${c?.[key] ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{c?.[key] ? 'Activo' : 'Oculto'}</button></td>)}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {products.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">Todavía no tienes productos. Empieza creando el primero.</div>}
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-border bg-card p-6">
              <p className="text-xs font-black uppercase tracking-[.18em] text-primary">Catálogos</p>
              <h2 className="mt-1 text-xl font-black">Catálogo privado / público</h2>
              <div className="mt-5 flex gap-2"><input value={catalogName} onChange={(e) => setCatalogName(e.target.value)} placeholder="Nombre del catálogo" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" /><button type="button" onClick={() => void createCatalog()} className="rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background">Crear</button></div>
              <select value={selectedCatalog} onChange={(e) => setSelectedCatalog(e.target.value)} className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="">Seleccionar catálogo</option>{catalogs.map((catalog) => <option key={catalog.id} value={catalog.id}>{catalog.name} · {catalog.status}</option>)}</select>
              <select value={catalogAudience} onChange={(e) => setCatalogAudience(e.target.value as 'b2c' | 'b2b' | 'both')} className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="b2c">B2C</option><option value="b2b">B2B</option><option value="both">B2C + B2B</option></select>
              {selectedCatalog && <><p className="mt-4 text-xs text-muted-foreground">Selecciona productos del catálogo:</p><div className="mt-2 max-h-52 overflow-auto space-y-2">{products.map((product) => <label key={product.id} className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm"><input type="checkbox" checked={catalogItems.has(product.id)} onChange={() => void toggleCatalogItem(product.id)} /> <span className="truncate font-semibold">{product.title}</span></label>)}</div><button type="button" onClick={() => void publishCatalog()} className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground">Publicar catálogo en Marketplace</button></>}
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">Publicar un catálogo no obliga a vender sus productos: cada producto conserva sus propios controles.</p>
            </section>

            <section className="rounded-3xl border border-border bg-card p-6">
              <p className="text-xs font-black uppercase tracking-[.18em] text-primary">Contenido</p>
              <h2 className="mt-1 text-xl font-black">Portal Credi</h2>
              <select value={selectedProductForContent} onChange={(e) => setSelectedProductForContent(e.target.value)} className="mt-4 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="">Sin producto asociado</option>{products.map((product) => <option key={product.id} value={product.id}>{product.title}</option>)}</select>
              <textarea value={postText} onChange={(e) => setPostText(e.target.value)} rows={3} placeholder="Escribe una publicación…" className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              <button type="button" onClick={() => void createPost()} className="mt-2 w-full rounded-xl bg-foreground px-4 py-2.5 text-sm font-black text-background">Publicar en feed</button>
              <textarea value={storyText} onChange={(e) => setStoryText(e.target.value)} rows={2} placeholder="Escribe una historia…" className="mt-4 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              <button type="button" onClick={() => void createStory()} className="mt-2 w-full rounded-xl border border-border px-4 py-2.5 text-sm font-black">Publicar historia 24 h</button>
            </section>
          </aside>
        </section>

        <section className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/dashboard/b2b" className="rounded-2xl border border-border bg-card p-5 hover:bg-muted/30"><p className="text-xs font-black uppercase tracking-wider text-primary">B2B</p><h3 className="mt-2 font-black">Catálogo mayorista</h3><p className="mt-1 text-sm text-muted-foreground">Precios mayoristas, MOQ, cotizaciones y ofertas.</p></Link>
          <Link href="/chat" className="rounded-2xl border border-border bg-card p-5 hover:bg-muted/30"><p className="text-xs font-black uppercase tracking-wider text-primary">Chat</p><h3 className="mt-2 font-black">Credi Business Chat</h3><p className="mt-1 text-sm text-muted-foreground">Negocia vinculando producto, pedido y empresa.</p></Link>
          <Link href="/dashboard/orders" className="rounded-2xl border border-border bg-card p-5 hover:bg-muted/30"><p className="text-xs font-black uppercase tracking-wider text-primary">Operaciones</p><h3 className="mt-2 font-black">Pedidos</h3><p className="mt-1 text-sm text-muted-foreground">Controla ventas y operaciones comerciales.</p></Link>
          <Link href="/pricing" className="rounded-2xl border border-border bg-card p-5 hover:bg-muted/30"><p className="text-xs font-black uppercase tracking-wider text-primary">Credi Pro</p><h3 className="mt-2 font-black">Planes y crecimiento</h3><p className="mt-1 text-sm text-muted-foreground">Amplía capacidades de tu operación.</p></Link>
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-border bg-card p-5"><p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-black tracking-tight">{value}</p></div>
}
