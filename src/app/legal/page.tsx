import type { Metadata } from "next";
import { getJurisdictionPolicy, JURISDICTION_POLICIES } from "@/config/jurisdictions";

export const metadata: Metadata = {
  title: "Centro Legal",
  description: "Políticas de privacidad, consumidores, vendedores, cookies y publicidad de Credi Marketplace.",
};

export default function LegalPage() {
  const policy = getJurisdictionPolicy("GLOBAL");
  const jurisdictions = Object.values(JURISDICTION_POLICIES).filter((item) => item.code !== "GLOBAL");

  return (
    <main className="min-h-screen bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Cumplimiento internacional</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Centro Legal de Credi Marketplace</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-muted-foreground">
            La plataforma aplica una línea base global y adapta controles según la jurisdicción del usuario, del vendedor, del consumidor y de la operación. Las políticas legales deben revisarse y actualizarse cuando cambien las leyes o el alcance comercial.
          </p>
        </header>

        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label="Políticas legales">
          {[
            ["/privacy", "Privacidad", "Datos personales, derechos, seguridad, retención y transferencias."],
            ["/terms", "Términos", "Reglas de uso, cuentas, marketplace, pedidos y responsabilidades."],
            ["/cookies", "Cookies", "Cookies necesarias, analítica y preferencias cuando la ley lo exige."],
            ["/consumer-rights", "Derechos del consumidor", "Información previa, pagos, entrega, reclamaciones y devoluciones aplicables."],
            ["/legal/sellers", "Vendedores", "Identidad del comerciante, información comercial y obligaciones de publicación."],
            ["/legal/advertising", "Publicidad y afiliados", "Divulgación de relaciones comerciales, contenido patrocinado y preferencias."],
          ].map(([href, title, description]) => (
            <a key={href} href={href} className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <h2 className="font-black text-foreground">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </a>
          ))}
        </section>

        <section className="rounded-3xl border border-border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-black text-foreground">Línea base global</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {policy.privacyFramework.concat(policy.marketplaceRequirements, policy.marketingRequirements, policy.consumerRequirements).map((item) => (
              <div key={item} className="rounded-xl bg-muted p-4 text-sm font-semibold text-foreground">{item}</div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-black text-foreground">Jurisdicciones contempladas</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {jurisdictions.map((item) => (
              <div key={item.code} className="rounded-xl border border-border p-4">
                <p className="font-black text-foreground">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.code}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-5 text-muted-foreground">
            Esta matriz es una capa técnica de cumplimiento y no sustituye asesoramiento jurídico local ni la revisión de licencias o requisitos sectoriales de un producto.
          </p>
        </section>
      </div>
    </main>
  );
}
