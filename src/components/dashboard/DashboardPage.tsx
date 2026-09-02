"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface DashboardCardProps {
  href: string;
  icon: string;
  title: string;
  description: string;
  highlighted?: boolean;
}

function DashboardCard({
  href,
  icon,
  title,
  description,
  highlighted = false,
}: DashboardCardProps) {
  return (
    <Link
      href={href}
      className={[
        "group relative overflow-hidden rounded-2xl border p-6 transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        highlighted
          ? "border-primary/20 bg-primary/[0.04]"
          : "border-border bg-card",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className={[
            "flex h-11 w-11 items-center justify-center rounded-xl text-lg font-black",
            highlighted
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground",
          ].join(" ")}
          aria-hidden="true"
        >
          {icon}
        </div>

        <span className="text-lg text-muted-foreground transition-transform duration-200 group-hover:translate-x-1">
          →
        </span>
      </div>

      <h3 className="mt-5 text-base font-black text-foreground">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </Link>
  );
}

export default function DashboardPage() {
  const { user, profile, loading, isAdmin, hasRole } = useAuth();

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center px-4">
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary"
              aria-label="Cargando"
              role="status"
            />

            <p className="text-sm font-medium text-muted-foreground">
              Preparando tu panel de control...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
          <section className="w-full overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
            <div className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-background px-6 py-12 text-center sm:px-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground shadow-lg">
                C
              </div>

              <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                Credi Marketplace
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                Tu centro de operaciones
              </h1>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                Inicia sesión para administrar tu perfil, compras,
                productos, servicios y actividad dentro de la plataforma.
              </p>
            </div>

            <div className="flex flex-col gap-3 p-6 sm:flex-row sm:justify-center sm:p-8">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
              >
                Iniciar sesión
              </Link>

              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-6 py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted"
              >
                Crear una cuenta
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const displayName =
    profile?.fullName?.trim() ||
    user.email?.split("@")[0] ||
    "Usuario";

  const email = profile?.email || user.email || "";

  const roleLabel = (() => {
    if (isAdmin) return "Administrador";
    if (hasRole("vendor")) return "Vendedor";
    if (hasRole("professional")) return "Profesional";
    if (hasRole("company")) return "Empresa";

    return "Cliente";
  })();

  const hasCommercialRole =
    hasRole("vendor") ||
    hasRole("professional") ||
    hasRole("company") ||
    isAdmin;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent"
          />

          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4 sm:gap-5">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary text-lg font-black text-primary-foreground shadow-lg sm:h-16 sm:w-16">
                  {profile?.avatarUrl ? (
                    <Image
                      src={profile.avatarUrl}
                      alt={`Avatar de ${displayName}`}
                      fill
                      sizes="(max-width: 640px) 56px, 64px"
                      className="object-cover"
                    />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                      Panel de control
                    </span>

                    <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {roleLabel}
                    </span>
                  </div>

                  <h1 className="truncate text-2xl font-black tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                    Bienvenido, {displayName}
                  </h1>

                  <p className="mt-2 max-w-2xl truncate text-sm text-muted-foreground">
                    {email}
                  </p>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Gestiona tu actividad, compras, productos,
                    servicios y configuración desde un único lugar.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard/profile"
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-5 py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted"
                >
                  Mi perfil
                </Link>

                <Link
                  href="/marketplace"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
                >
                  Explorar Marketplace
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Acceso rápido
            </p>

            <h2 className="mt-1 text-xl font-black tracking-tight text-foreground">
              Administra tu cuenta
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardCard
              href="/dashboard/profile"
              icon="◉"
              title="Mi perfil"
              description="Actualiza tus datos personales, información pública y configuración."
            />

            <DashboardCard
              href="/dashboard/orders"
              icon="▣"
              title="Mis órdenes"
              description="Consulta compras, pedidos, estados, pagos y seguimiento."
            />

            <DashboardCard
              href="/marketplace"
              icon="◆"
              title="Marketplace"
              description="Explora productos, servicios y oportunidades."
            />

            <DashboardCard
              href="/services"
              icon="✦"
              title="Servicios"
              description="Encuentra profesionales y proveedores de servicios."
            />
          </div>
        </section>

        {hasCommercialRole && (
          <section className="mt-10">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Área comercial
              </p>

              <h2 className="mt-1 text-xl font-black tracking-tight text-foreground">
                Herramientas para crecer
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(hasRole("vendor") || isAdmin) && (
                <DashboardCard
                  href="/dashboard/seller"
                  icon="▰"
                  title="Panel del vendedor"
                  description="Gestiona tu tienda, productos e inventario."
                  highlighted
                />
              )}

              {(hasRole("professional") ||
                hasRole("company") ||
                isAdmin) && (
                <DashboardCard
                  href="/jobs"
                  icon="◇"
                  title="Oportunidades profesionales"
                  description="Explora oportunidades laborales o procesos de contratación."
                />
              )}

              {(hasRole("vendor") ||
                hasRole("company") ||
                isAdmin) && (
                <DashboardCard
                  href="/seller/b2b"
                  icon="◆"
                  title="Ventas B2B"
                  description="Gestiona productos destinados al comercio mayorista."
                />
              )}
            </div>
          </section>
        )}

        {isAdmin && (
          <section className="mt-10">
            <div className="rounded-3xl border border-amber-500/20 bg-amber-500/[0.04] p-6 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Administración
                  </span>

                  <h2 className="mt-3 text-xl font-black text-foreground">
                    Centro administrativo
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Las funciones administrativas están protegidas
                    mediante autorización del servidor y políticas RLS.
                  </p>
                </div>

                <Link
                  href="/admin"
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-foreground px-5 py-3 text-sm font-bold text-background transition-opacity hover:opacity-90"
                >
                  Administración →
                </Link>
              </div>
            </div>
          </section>
        )}

        <section className="mt-10">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Estado de cuenta
            </p>

            <h2 className="mt-2 text-xl font-black text-foreground">
              Cuenta activa
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Tu sesión está autenticada y tu perfil está disponible.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
```
