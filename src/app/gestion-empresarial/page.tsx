import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Gestión empresarial | Credi Marketplace',
  description: 'Centro operativo para productos, inventario, catálogos, B2B, reputación, contenido y crecimiento comercial en Credi Marketplace.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

const productFields = 'id,title,price,stock,is_active,created_at'

async function getWorkspaceData() {
  const supabase = await createClient()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) redirect('/login?next=%2Fgestion-empresarial')

  const user = auth.user
  const [{ data: profile }, { data: store }, { data: subscriptions }] = await Promise.all([
    supabase.from('profiles').select('full_name,role,is_active').eq('id', user.id).maybeSingle(),
    supabase.from('stores').select('id,store_name,slug,is_verified,is_active').eq('vendor_id', user.id).maybeSingle(),
    supabase
      .from('subscriptions')
      .select('status,billing_interval,plans(name,code,limits)')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const subscription = subscriptions?.[0]
  const related = subscription?.plans
  const plan = Array.isArray(related) ? related[0] : related
  const planName = typeof plan?.name === 'string' ? plan.name : 'Free'
  const planCode = typeof plan?.code === 'string' ? plan.code : 'free'
  const limits = plan?.limits && typeof plan.limits === 'object' ? plan.limits as Record<string, unknown> : {}
  const storageMb = Number(limits.storage_mb ?? 250)

  let products: Array<{
    id: string
    title: string
    price: number
    stock: number
    is_active: boolean
    created_at: string
  }> = []

  if (store?.id) {
    const { data } = await supabase
      .from('products')
      .select(productFields)
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })
      .limit(100)
    products = (data ?? []) as typeof products
  }

  const verified = Boolean(store?.is_verified)
  const active = profile?.is_active !== false && store?.is_active !== false

  return {
    user,
    profile,
    store,
    products,
    verified,
    active,
    planName,
    planCode,
    storageMb: Number.isFinite(storageMb) ? storageMb : 250,
    billingInterval: subscription?.billing_interval ?? 'free',
  }
}

function currency(value: number) {
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
}

export default async function BusinessManagementPage() {
  const data = await getWorkspaceData()
  const { profile, store, products } = data
  const totalStock = products.reduce((sum, product) => sum + Math.max(0, Number(product.stock)), 0)
  const stockValue = products.reduce((sum, product) => sum + Math.max(0, Number(product.stock)) * Math.max(0, Number(product.price)), 0)
  const lowStock = products.filter((product) => product.stock > 0 && product.stock <= 5).length
  const activeProducts = products.filter((product) => product.is_active).length
  const displayName = store?.store_name || profile?.full_name || data.user.email?.split('@')[0] || 'Mi empresa'

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/[0.16] via-card to-background p-6 sm:p-8 lg:p-10">
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-4xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-primary">Credi Business OS</span>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] ${data.verified ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-700' : 'border-amber-400/30 bg-amber-500/10 text-amber-700'}`}>
                    {data.verified ? 'Empresa verificada' : 'Verificación pendiente'}
                  </span>
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{displayName}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                  Un centro operativo para publicar productos, controlar inventario, activar canales, gestionar B2B, crear catálogos y crecer con Credi.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <Link href="/products/create" className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground shadow-sm hover:opacity-90">Nuevo producto</Link>
                <Link href="/dashboard/b2b" className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-5 py-3 text-sm font-black hover:bg-muted">B2B</Link>
                <Link href="/chat" className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-5 py-3 text-sm font-black hover:bg-muted">Credi Chat</Link>
                <Link href="/orders" className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-5 py-3 text-sm font-black hover:bg-muted">Pedidos</Link>
              </div>
            </div>
          </div>
        </section>

        {!store ? (
          <section className="mt-6 overflow-hidden rounded-[2rem] border border-amber-200 bg-gradient-to-br from-amber-50 to-card p-6 sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-amber-700">Primer paso</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-amber-950 sm:text-3xl">Tu centro empresarial ya está disponible</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-amber-900/80">
                  Todavía no existe una tienda asociada a esta cuenta. Puedes configurar tu perfil comercial, completar la verificación y después publicar tu primer producto.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/account/verificacion" className="rounded-xl bg-foreground px-5 py-3 text-sm font-black text-background">Comenzar verificación</Link>
                  <Link href="/dashboard/profile" className="rounded-xl border border-amber-300 bg-background px-5 py-3 text-sm font-black text-amber-950">Configurar empresa</Link>
                  <Link href="/products/create" className="rounded-xl border border-amber-300 bg-background px-5 py-3 text-sm font-black text-amber-950">Preparar producto</Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
                {['Identidad', 'Empresa', 'Catálogo', 'B2B'].map((item) => (
                  <div key={item} className="rounded-2xl border border-amber-200 bg-white/70 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Paso</p>
                    <p className="mt-2 font-black text-amber-950">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Metric label="Productos" value={products.length.toString()} />
          <Metric label="Activos" value={activeProducts.toString()} />
          <Metric label="Stock" value={totalStock.toLocaleString('es-ES')} />
          <Metric label="Stock bajo" value={lowStock.toString()} />
          <Metric label="Valor inventario" value={currency(stockValue)} />
          <Metric label="Plan" value={data.planName} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_.9fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.18em] text-primary">Productos</p>
                  <h2 className="mt-1 text-2xl font-black">Tu operación comercial</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Cada producto comienza privado. Tú decides cuándo entra a Marketplace, B2B, feed, historias o venta.</p>
                </div>
                <Link href="/products/create" className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-black text-background">Publicar producto</Link>
              </div>

              <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
                {products.length ? (
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-muted/50">
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Producto</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Precio</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Stock</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Estado</th>
                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-muted-foreground">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {products.slice(0, 12).map((product) => (
                        <tr key={product.id} className="hover:bg-muted/20">
                          <td className="max-w-[320px] px-4 py-4">
                            <p className="truncate font-bold">{product.title}</p>
                            <p className="mt-1 font-mono text-[10px] text-muted-foreground">{product.id.slice(0, 12)}…</p>
                          </td>
                          <td className="px-4 py-4 font-black">{currency(Number(product.price))}</td>
                          <td className="px-4 py-4 font-semibold">{product.stock}</td>
                          <td className="px-4 py-4">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${product.is_active ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>{product.is_active ? 'Activo' : 'Pausado'}</span>
                          </td>
                          <td className="px-4 py-4 text-right"><Link href="/gestion-empresarial" className="font-bold text-primary hover:underline">Gestionar</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-10 text-center">
                    <p className="text-lg font-black">Todavía no tienes productos</p>
                    <p className="mt-2 text-sm text-muted-foreground">Empieza con el nuevo Publisher Studio y crea tu primer producto desde un formulario guiado.</p>
                    <Link href="/products/create" className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground">Crear primer producto</Link>
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <ActionCard href="/dashboard/b2b" eyebrow="B2B" title="Compras y ventas mayoristas" text="Precios mayoristas, MOQ, cotizaciones, publicación moderada y operaciones empresariales." />
              <ActionCard href="/red-comercial" eyebrow="Red" title="Red Comercial" text="Encuentra clientes, proveedores y conversaciones con contexto comercial." />
              <ActionCard href="/proveedores-verificados" eyebrow="Trust" title="Proveedores verificados" text="Construye relaciones con empresas sometidas a controles de identidad y cumplimiento." />
              <ActionCard href="/dashboard/reputation" eyebrow="Reputación" title="Reputación Credi" text="Consulta y gestiona la reputación que nace de operaciones reales." />
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.18em] text-primary">Capacidad</p>
                  <h2 className="mt-1 text-xl font-black">{data.planName}</h2>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${data.active ? 'bg-emerald-500/10 text-emerald-700' : 'bg-destructive/10 text-destructive'}`}>{data.active ? 'Operativo' : 'Revisión'}</span>
              </div>
              <div className="mt-5 rounded-2xl bg-muted/50 p-4">
                <p className="text-xs font-bold text-muted-foreground">Almacenamiento contratado</p>
                <p className="mt-1 text-2xl font-black">{data.storageMb.toLocaleString('es-ES')} MB</p>
                <p className="mt-1 text-xs text-muted-foreground">Media privada de Credi Chat y capacidades del plan.</p>
              </div>
              <Link href="/pricing" className="mt-4 inline-flex w-full justify-center rounded-xl border border-border px-4 py-3 text-sm font-black hover:bg-muted">Administrar plan</Link>
            </section>

            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[.18em] text-primary">Seguridad comercial</p>
              <h2 className="mt-1 text-xl font-black">Estado de confianza</h2>
              <div className="mt-5 space-y-3">
                <StatusRow label="Cuenta activa" ok={data.active} />
                <StatusRow label="Empresa verificada" ok={data.verified} />
                <StatusRow label="Operación B2B" ok={data.verified} />
              </div>
              {!data.verified ? <Link href="/account/verificacion" className="mt-5 inline-flex w-full justify-center rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-white">Completar verificación</Link> : null}
            </section>
          </aside>
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 truncate text-xl font-black tracking-tight sm:text-2xl">{value}</p></div>
}

function ActionCard({ href, eyebrow, title, text }: { href: string; eyebrow: string; title: string; text: string }) {
  return <Link href={href} className="group rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:bg-muted/30"><p className="text-[10px] font-black uppercase tracking-[.18em] text-primary">{eyebrow}</p><h3 className="mt-2 text-lg font-black group-hover:text-primary">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p><span className="mt-4 inline-block text-xs font-black text-primary">Abrir centro →</span></Link>
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3"><span className="text-sm font-semibold">{label}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${ok ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'}`}>{ok ? 'LISTO' : 'PENDIENTE'}</span></div>
}
