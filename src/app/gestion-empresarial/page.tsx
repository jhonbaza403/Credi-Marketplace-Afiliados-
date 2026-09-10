import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import BusinessControlCenter from '@/components/dashboard/BusinessControlCenter'
import { getPublicCommercialPlans } from '@/lib/billing/plans'

export const metadata: Metadata = {
  title: 'Gestión empresarial | Credi Marketplace',
  description: 'Centro privado para administrar inventario, catálogos, B2B, publicaciones, historias y operaciones comerciales en Credi Marketplace.',
  robots: { index: false, follow: false },
}

async function getCurrentPlan() {
  const fallback = { name: 'Free', code: 'free', storageMb: 250 }
  try {
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return fallback

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_id, plans(name,code,limits)')
      .eq('user_id', auth.user.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const related = subscription?.plans
    const plan = Array.isArray(related) ? related[0] : related
    if (plan) {
      const limits = plan.limits as Record<string, unknown> | null
      const storageMb = Number(limits?.storage_mb ?? fallback.storageMb)
      return { name: String(plan.name), code: String(plan.code), storageMb: Number.isFinite(storageMb) ? storageMb : fallback.storageMb }
    }

    const publicPlans = await getPublicCommercialPlans()
    const free = publicPlans.find((item) => item.code === 'free')
    return free
      ? { name: free.name, code: free.code, storageMb: Number(free.limits.storage_mb ?? fallback.storageMb) }
      : fallback
  } catch {
    return fallback
  }
}

export default async function BusinessManagementPage() {
  const plan = await getCurrentPlan()

  return (
    <>
      <section className="mx-auto w-full max-w-[1500px] px-3 pt-4 sm:px-6 sm:pt-7">
        <div className="flex flex-col gap-4 rounded-3xl border border-cyan-300/10 bg-[#08101f] p-5 shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Plan comercial activo</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black text-white">{plan.name}</h1>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                {plan.storageMb.toLocaleString('es-ES')} MB de almacenamiento
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-400">La capacidad de media privada de Credi Chat se controla con tu plan comercial.</p>
          </div>
          <a href="/pricing" className="inline-flex items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/20">
            Administrar plan
          </a>
        </div>
      </section>
      <BusinessControlCenter />
    </>
  )
}
