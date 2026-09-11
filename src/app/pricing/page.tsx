import type { Metadata } from "next";
import Link from "next/link";
import {
  commercialPlanFeatures,
  formatPlanPrice,
  getPublicCommercialPlans,
} from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "Planes comerciales | Credi Marketplace",
  description:
    "Credi Marketplace es gratis para empezar y ofrece planes opcionales para escalar capacidades comerciales, sociales y empresariales.",
};

export const dynamic = "force-dynamic";

const audienceLabel: Record<string, string> = {
  all: "Para todos",
  creator: "Creadores y afiliados",
  vendor: "Vendedores",
  business: "Negocios",
  enterprise: "Empresas",
};

type CheckoutButtonProps = {
  planCode: string;
  interval: "monthly" | "yearly";
};

function CheckoutButton({ planCode, interval }: CheckoutButtonProps) {
  return (
    <form action="/api/billing/checkout" method="post">
      <input type="hidden" name="plan" value={planCode} />
      <input type="hidden" name="interval" value={interval} />
      <button
        type="submit"
        className="w-full rounded-2xl bg-[var(--foreground)] px-4 py-3 text-center text-sm font-black text-[var(--background)] shadow-[0_14px_30px_rgba(15,23,42,.12)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,.18)]"
      >
        Suscribirme {interval === "yearly" ? "anual" : "mensual"}
      </button>
    </form>
  );
}

export default async function PricingPage() {
  const plans = await getPublicCommercialPlans();

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--primary)] shadow-sm">
            Monetización freemium
          </span>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-[var(--foreground)] sm:text-6xl [text-shadow:0_2px_0_var(--surface),0_8px_22px_rgba(15,23,42,.16)]">
            Credi Marketplace es gratis para empezar
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-[var(--muted)] sm:text-lg">
            Empieza sin suscripción y escala cuando tu negocio lo necesite. Los planes comerciales amplían capacidad, automatización, analítica, equipos e integraciones.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white shadow-lg hover:-translate-y-0.5">
              Empezar gratis
            </Link>
            <Link href="/gestion-empresarial" className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] px-5 py-3 text-sm font-black text-[var(--foreground)] shadow-sm hover:bg-[var(--surface-secondary)]">
              Ver centro empresarial
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-4">
          {plans.map((plan) => {
            const featured = plan.code === "business";
            const monthly = formatPlanPrice(plan, "monthly");
            const yearly = formatPlanPrice(plan, "yearly");

            return (
              <article
                key={plan.code}
                className={`relative flex h-full flex-col overflow-hidden rounded-[2rem] border p-7 shadow-[0_24px_70px_rgba(15,23,42,.10)] ${featured ? "border-[var(--primary)] bg-[var(--surface)]" : "border-[var(--border)] bg-[var(--surface)]"}`}
              >
                {featured && (
                  <span className="absolute right-5 top-5 rounded-full bg-[var(--primary)] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                    Más elegido
                  </span>
                )}
                <p className="text-xs font-black uppercase tracking-[.16em] text-[var(--primary)]">
                  {audienceLabel[plan.audience] ?? "Plan comercial"}
                </p>
                <h2 className="mt-3 text-3xl font-black text-[var(--foreground)] [text-shadow:0_2px_0_var(--surface),0_5px_12px_rgba(15,23,42,.12)]">{plan.name}</h2>
                <p className="mt-3 min-h-16 text-sm leading-6 text-[var(--muted)]">{plan.description}</p>
                <div className="mt-7 flex items-end gap-2">
                  <span className="text-4xl font-black text-[var(--foreground)]">{monthly}</span>
                  {!plan.is_free && <span className="mb-1 text-sm font-bold text-[var(--muted)]">/mes</span>}
                </div>
                {!plan.is_free && <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{yearly} al año · ahorro frente al pago mensual</p>}
                <div className="my-7 h-px bg-[var(--border)]" />
                <ul className="space-y-3 text-sm text-[var(--foreground)]">
                  {commercialPlanFeatures[plan.code].map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <span className="mt-0.5 font-black text-[var(--primary)]">✓</span>
                      <span className="leading-6">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto space-y-3 pt-8">
                  {plan.is_free ? (
                    <Link href="/register" className="block w-full rounded-2xl bg-[var(--primary)] px-4 py-3 text-center text-sm font-black text-white shadow-md hover:-translate-y-0.5">
                      Crear cuenta gratis
                    </Link>
                  ) : (
                    <>
                      <CheckoutButton planCode={plan.code} interval="monthly" />
                      <CheckoutButton planCode={plan.code} interval="yearly" />
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="mx-auto mt-12 max-w-4xl rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm leading-7 text-[var(--muted)] shadow-sm">
          <strong className="text-[var(--foreground)]">Gratis para empezar.</strong> El acceso básico permanece disponible sin suscripción. Al terminar o cancelar una suscripción de pago, las capacidades premium dejan de considerarse efectivas según el estado de la suscripción.
        </div>
      </section>
    </main>
  );
}
