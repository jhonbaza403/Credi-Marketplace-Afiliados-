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

const CONTROL_KEYS = [
  'catalog_visible',
  'marketplace_visible',
  'b2b_visible',
  'feed_visible',
  'story_visible',
  'sale_enabled',
] as const

type ControlKey = (typeof CONTROL_KEYS)[number]

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
    if (!user || !canManage) return
    setBusy(true)
    setError(null)

    try {
      const storeResult = await supabase
        .from('stores')
        .select('id,store_name,slug')
        .eq('vendor_id', user.id)
        .maybeSingle()
      let store = storeResult.data
      const storeError = storeResult.error

      if (storeError) throw storeError

      if (!store) {
        const base = (profile?.fullName || user.email?.split('@')[0] || 'empresa').trim().toLowerCase()
        const slugBase = base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'empresa'
        const created = await supabase
          .from('stores')
          .insert({
            vendor_id: user.id,
            store_name: profile?.fullName ? `${profile.fullName} | Credi` : 'Mi empresa | Credi',
            slug: `${slugBase}-${user.id.slice(0, 8)}`,
            description: 'Empresa en Credi Marketplace',
            is_verified: false,
            is_active: true,
          })
          .select('id,store_name,slug')
          .single()

        if (created.error) throw created.error
        store = created.data
      }

      if (!store) throw new Error('No existe una empresa operativa asociada a esta cuenta.')

      const [workspaceResult, productsResult, controlsResult, catalogsResult] = await Promise.all([
        supabase.from('business_workspaces').select('display_name,slug').eq('owner_id', user.id).maybeSingle(),
        supabase.from('products').select('id,title,price,stock,is_active').eq('store_id', store.id).order('created_at', { ascending: false }),
        supabase.from('product_publication_controls').select('product_id,catalog_visible,marketplace_visible,b2b_visible,feed_visible,story_visible,sale_enabled').eq('owner_id', user.id),
        supabase.from('business_catalogs').select('id,name,audience,visibility,status').eq('owner_id', user.id).order('created_at', { ascending: false }),
      ])

      if (workspaceResult.error) throw workspaceResult.error
      if (productsResult.error) throw productsResult.error
      if (controlsResult.error) throw controlsResult.error
      if (catalogsResult.error) throw catalogsResult.error

      let nextWorkspace = workspaceResult.data as Workspace | null
      if (!nextWorkspace) {
        const created = await supabase
          .from('business_workspaces')
          .insert({
            owner_id: user.id,
            default_store_id: store.id,
            display_name: store.store_name,
            slug: store.slug,
          })
          .select('display_name,slug')
          .single()
        if (created.error) throw created.error
        nextWorkspace = created.data as Workspace
      }

      const nextProducts = (productsResult.data ?? []) as Product[]
      const nextControls: Record<string, Control> = {}
      for (const row of (controlsResult.data ?? []) as Control[]) nextControls[row.product_id] = row

      const missing = nextProducts.filter((product) => !nextControls[product.id])
      if (missing.length) {
        const seedResult = await supabase
          .from('product_publication_controls')
          .insert(
            missing.map((product) => ({
              product_id: product.id,
              owner_id: user.id,
              catalog_visible: false,
              marketplace_visible: false,
              b2b_visible: false,
              feed_visible: false,
              story_visible: false,
              sale_enabled: false,
            })),
          )
          .select('product_id,catalog_visible,marketplace_visible,b2b_visible,feed_visible,story_visible,sale_enabled')

        if (seedResult.error) throw seedResult.error
        for (const row of (seedResult.data ?? []) as Control[]) nextControls[row.product_id] = row
      }

      setWorkspace(nextWorkspace)
      setProducts(nextProducts)
      setControls(nextControls)
      setCatalogs((catalogsResult.data ?? []) as Catalog[])

      const firstCatalog = (catalogsResult.data ?? [])[0] as Catalog | undefined
      if (firstCatalog && !selectedCatalog) setSelectedCatalog(firstCatalog.id)
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
    if (!selectedCatalog || !user) {
      setCatalogItems(new Set())
      return
    }

    void (async () => {
      const { data, error: itemError } = await supabase
        .from('business_catalog_items')
        .select('product_id')
        .eq('catalog_id', selectedCatalog)
        .eq('owner_id', user.id)
      if (itemError) return setError(itemError.message)
      setCatalogItems(new Set((data ?? []).map((row) => row.product_id as string)))
    })()
  }, [selectedCatalog, user])

  const metrics = useMemo(() => {
    const publicCount = products.filter((product) => controls[product.id]?.marketplace_visible).length
    const saleCount = products.filter((product) => controls[product.id]?.sale_enabled).length
    const b2bCount = products.filter((product) => controls[product.id]?.b2b_visible).length
    const low = products.filter((product) => product.stock > 0 && product.stock <= 5).length
    const value = products.reduce((sum, product) => sum + Number(product.price || 0) * Number(product.stock || 0), 0)
    return { total: products.length, publicCount, saleCount, b2bCount, low, value }
  }, [controls, products])

  async function toggle(productId: string, key: ControlKey) {
    if (!user) return
    const current = controls[productId]
    if (!current) return

    const nextValue = !current[key]
    setError(null)
    setMessage(null)

    const { error: updateError } = await supabase
      .from('product_publication_controls')
      .update({ [key]: nextValue })
      .eq('product_id', productId)
      .eq('owner_id', user.id)

    if (updateError) return setError(updateError.message)

    setControls((state) => ({
      ...state,
      [productId]: { ...current, [key]: nextValue },
    }))
    setMessage('Control de publicación actualizado.')
  }

  async function updateStock(productId: string, raw: string) {
    const stock = Number(raw)
    if (!Number.isInteger(stock) || stock < 0) return

    setError(null)
    const { error: productError } = await supabase.from('products').update({ stock }).eq('id', productId)
    if (productError) return setError(productError.message)

    const { error: inventoryError } = await supabase
      .from('inventory')
      .upsert({ product_id: productId, available_quantity: stock }, { onConflict: 'product_id' })

    if (inventoryError && inventoryError.code !== '42P01') return setError(inventoryError.message)

    setProducts((items) => items.map((product) => (product.id === productId ? { ...product, stock } : product)))
    setMessage('Inventario actualizado.')
  }

  async function createCatalog() {
    if (!user) return
    const name = catalogName.trim()
    if (name.length < 2) return

    setError(null)
    const { data, error: createError } = await supabase
      .from('business_catalogs')
      .insert({ owner_id: user.id, name, audience: catalogAudience, visibility: 'private', status: 'draft' })
      .select('id,name,audience,visibility,status')
      .single()

    if (createError) return setError(createError.message)