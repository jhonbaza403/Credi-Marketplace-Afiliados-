import type { Metadata } from "next";
import {
  commercialPlanFeatures,
  formatPlanPrice,
  getPublicCommercialPlans,
} from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "Planes comerciales",
  description:
    "Credi Marketplace es de acceso gratuito y ofrece planes opcionales para ampliar las herramientas comerciales, sociales y empresariales.",
};

export const dynamic = "force-dynamic";

const audienceLabel: Record<string, string> = {
  all: "Para todos",
  creator: "Creadores y afiliados",
  vendor: "Vendedores",
  business: "Negocios",
  enterprise: "Empresas",
};

function CheckoutButton({ plan, interval }: { plan: (typeof plans)[number]; interval: "monthly" | "yearly" }) {
  return (
    <form action="/api/billing/checkout" method="post">
      <input type="hidden" name="plan" value={plan.code} />
      <input type="hidden" name="interval" value={interval} />
      <button
        type="submit"
        className="block w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-white/15"
      >
        Suscribirme {interval === "yearly" ? "anual" : "mensual"}
      </button>
    </form>
  );
}

const plans = await getPublicCommercialPlans();

export default async function PricingPage() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
          Monetización freemium
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Credi Marketplace es gratis para empezar
        </h1>
        <p className="mt-5 text-lg leading-8 text-white/70">
          El acceso esencial a la comunidad y al marketplace no depende de una suscripción.
          Los planes comerciales son opcionales y desbloquean capacidad, analítica,
          automatización y herramientas profesionales.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-4">
        {plans.map((plan) => {
          const featured = plan.code === "business";
          const monthly = formatPlanPrice(plan, "monthly");
          const yearly = formatPlanPrice(plan, "yearly");

          return (
            <article
              key={plan.code}
              className={`relative flex h-full flex-col rounded-3xl border p-7 shadow-2xl backdrop-blur ${
                featured
                  ? "border-cyan-400/40 bg-cyan-400/10"
                  : "border-white/10 bg-white/[0.04]"
              }`}
            >
              {featured && (
                <span className="absolute right-5 top-5 rounded-full bg-cyan-300 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-950">
                  Más elegido
                </span>
              )}

              <p className="text-sm font-semibold uppercase tracking-widest text-white/50">
                {audienceLabel[plan.audience] ?? "Plan comercial"}
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white">{plan.name}</h2>
              <p className="mt-3 min-h-16 text-sm leading-6 text-white/65">{plan.description}</p>

              <div className="mt-7 flex items-end gap-2">
                <span className="text-4xl font-bold text-white">{monthly}</span>
                {!plan.is_free && <span className="mb-1 text-sm text-white/50">/mes</span>}
              </div>

              {!plan.is_free && (
                <p className="mt-1 text-xs text-white/45">
                  {yearly} al año · ahorro frente al pago mensual
                </p>
              )}

              <div className="my-7 h-px bg-white/10" />

              <ul className="space-y-3 text-sm text-white/75">
                {commercialPlanFeatures[plan.code].map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <span className="mt-0.5 text-cyan-300">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto space-y-3 pt-8">
                {plan.is_free ? (
                  <a
                    href="/register"
                    className="block rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-white/15"
                  >
                    Crear cuenta gratis
                  </a>
                ) : (
                  <>
                    <CheckoutButton plan={plan} interval="monthly" />
                    <CheckoutButton plan={plan} interval="yearly" />
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mx-auto mt-12 max-w-4xl rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm leading-6 text-white/55">
        Credi Marketplace mantiene un modelo de entrada gratuita. Las suscripciones son
        opcionales y se procesan mediante Checkout de Stripe; el acceso básico no exige
        una suscripción de pago.
      </div>
    </section>
  );
}
