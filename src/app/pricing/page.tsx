import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Sparkles, Zap } from "lucide-react";
import { commercialPlanFeatures, formatPlanPrice, getPublicCommercialPlans } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "Planes comerciales | Credi Marketplace",
  description: "Credi Marketplace es gratis para empezar y ofrece planes opcionales para escalar capacidades comerciales, sociales y empresariales.",
};

export const dynamic = "force-dynamic";

const audienceLabel: Record<string, string> = {
  all: "Para todos",
  creator: "Creadores y afiliados",
  vendor: "Vendedores",
  business: "Negocios",
  enterprise: "Empresas",
};

function CheckoutButton({ planCode }: { planCode: string }) {
  return (
    <form action="/api/billing/checkout" method="post" className="space-y-3">
      <input type="hidden" name="plan" value={planCode} />
      <label className="sr-only" htmlFor={`billing-interval-${planCode}`}>Periodicidad de facturación</label>
      <select id={`billing-interval-${planCode}`} name="interval" defaultValue="monthly" className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-sm font-bold text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30">
        <option value="monthly">Facturación mensual</option>
        <option value="yearly">Facturación anual</option>
      </select>
      <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--foreground)] px-4 py-3 text-center text-sm font-black text-[var(--background)] shadow-[0_14px_30px_rgba(15,23,42,.12)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,.18)]">
        Continuar con el plan <ArrowRight className="size-4" />
      </button>
    </form>
  );
}

export default async function PricingPage() {
  const plans = await getPublicCommercialPlans();
  const freePlan = plans.find((plan) => plan.is_free);
  const paidPlans = plans.filter((plan) => !plan.is_free);
  const freeFeatures = freePlan ? commercialPlanFeatures[freePlan.code] ?? [] : [];

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--primary)] shadow-sm"><Sparkles className="size-4" /> Credi Free primero</span>
          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">Empieza gratis. Escala cuando realmente lo necesites.</h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-[var(--muted)] sm:text-lg">La experiencia básica de Credi permanece disponible sin suscripción. Los planes comerciales amplían capacidades; no sustituyen el acceso fundamental a la plataforma.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5">Empezar gratis <ArrowRight className="size-4" /></Link>
            <Link href="/marketplace" className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] px-5 py-3 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--surface-secondary)]">Explorar Marketplace</Link>
          </div>
        </div>

        {freePlan && (
          <section className="relative mt-12 overflow-hidden rounded-[2rem] border border-brand-500/25 bg-gradient-to-br from-brand-50 via-[var(--surface)] to-cyan-50 p-7 shadow-[0_28px_90px_rgba(37,99,235,.12)] dark:from-brand-950/45 dark:via-[var(--surface)] dark:to-cyan-950/25 sm:p-10">
            <div className="absolute -right-16 -top-16 size-48 rounded-full bg-brand-400/10 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1.25fr_.75fr] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-black text-white"><Zap className="size-4" /> Base Credi</span>
                  <span className="rounded-full border border-brand-500/20 bg-white/60 px-3 py-1.5 text-xs font-black text-brand-700 dark:bg-white/10 dark:text-brand-200">Siempre disponible</span>
                </div>
                <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{freePlan.name}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">{freePlan.description}</p>
                <div className="mt-6 flex flex-wrap items-end gap-x-3 gap-y-1">
                  <span className="text-5xl font-black tracking-tight">{formatPlanPrice(freePlan, "monthly")}</span>
                  <span className="pb-1 text-sm font-bold text-[var(--muted)]">sin suscripción</span>
                </div>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5">Crear cuenta gratis <ArrowRight className="size-4" /></Link>
                  <Link href="/social" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-5 py-3 text-sm font-black transition hover:-translate-y-0.5">Ver el Muro <ArrowRight className="size-4" /></Link>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-white/60 bg-white/60 p-6 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-black uppercase tracking-[.16em] text-[var(--primary)]">Incluye</p>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {freeFeatures.slice(0, 8).map((feature) => <li key={feature} className="flex gap-3 text-sm font-semibold leading-6"><span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]"><Check className="size-3" /></span>{feature}</li>)}
                </ul>
              </div>
            </div>
          </section>
        )}

        <div className="mt-12">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--primary)]">Escala comercial</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">Planes opcionales</h2></div>
            <p className="text-sm text-[var(--muted)]">{paidPlans.length} opciones para ampliar capacidades.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {paidPlans.map((plan) => {
              const featured = plan.code === "business";
              const monthly = formatPlanPrice(plan, "monthly");
              const yearly = formatPlanPrice(plan, "yearly");
              return (
                <article key={plan.code} className={`relative flex h-full flex-col overflow-hidden rounded-[2rem] border p-7 shadow-[0_24px_70px_rgba(15,23,42,.10)] ${featured ? "border-[var(--primary)] bg-[var(--surface)] ring-1 ring-[var(--primary)]/10" : "border-[var(--border)] bg-[var(--surface)]"}`}>
                  {featured && <span className="absolute right-5 top-5 rounded-full bg-[var(--primary)] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md">Más elegido</span>}
                  <p className="text-xs font-black uppercase tracking-[.16em] text-[var(--primary)]">{audienceLabel[plan.audience] ?? "Plan comercial"}</p>
                  <h3 className="mt-3 text-3xl font-black">{plan.name}</h3>
                  <p className="mt-3 min-h-16 text-sm leading-6 text-[var(--muted)]">{plan.description}</p>
                  <div className="mt-7 flex items-end gap-2"><span className="text-4xl font-black">{monthly}</span>{!plan.is_free && <span className="mb-1 text-sm font-bold text-[var(--muted)]">/mes</span>}</div>
                  <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{yearly} al año · ahorro frente al pago mensual</p>
                  <div className="my-7 h-px bg-[var(--border)]" />
                  <ul className="space-y-3 text-sm">
                    {(commercialPlanFeatures[plan.code] ?? []).map((feature) => <li key={feature} className="flex gap-3"><Check className="mt-1 size-4 shrink-0 text-[var(--primary)]" /><span className="leading-6">{feature}</span></li>)}
                  </ul>
                  <div className="mt-auto pt-8"><CheckoutButton planCode={plan.code} /></div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-4xl rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm leading-7 text-[var(--muted)] shadow-sm">
          <strong className="text-[var(--foreground)]">La cuenta gratuita sigue siendo la puerta de entrada.</strong> Al terminar o cancelar una suscripción de pago, las capacidades premium dejan de considerarse efectivas según el estado real de la suscripción.
        </div>
      </section>
    </main>
  );
}
