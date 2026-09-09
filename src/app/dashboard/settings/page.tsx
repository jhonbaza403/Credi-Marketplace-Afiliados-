import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Configuración | Credi Marketplace",
  description: "Configuración de la cuenta y accesos de Credi Marketplace.",
  robots: {
    index: false,
    follow: false,
  },
};

const settingsLinks = [
  {
    href: "/dashboard/profile",
    title: "Perfil",
    description: "Actualiza la información básica de tu cuenta.",
  },
  {
    href: "/dashboard/compliance",
    title: "Cumplimiento",
    description: "Consulta o completa los procesos de cumplimiento disponibles para tu cuenta.",
  },
  {
    href: "/dashboard",
    title: "Panel principal",
    description: "Regresa al centro de operaciones de tu cuenta.",
  },
] as const;

export default function DashboardSettingsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Cuenta
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Configuración
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Accede a las áreas de configuración que forman parte de la plataforma actual.
          </p>
        </header>

        <section aria-label="Opciones de configuración" className="grid gap-4 sm:grid-cols-2">
          {settingsLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-muted"
            >
              <h2 className="text-base font-black">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
              <span className="mt-4 inline-flex text-sm font-bold text-primary">
                Abrir sección →
              </span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
