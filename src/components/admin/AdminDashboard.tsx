```tsx
"use client";

// ==========================================================
// ARCHIVO:
// src/components/admin/AdminDashboard.tsx
//
// Credi Marketplace
//
// Dashboard administrativo
//
// Next.js 16 App Router
// ==========================================================

import Link from "next/link";

interface AdminCardProps {
  href: string;
  title: string;
  description: string;
}

function AdminCard({
  href,
  title,
  description,
}: AdminCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-border bg-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-black text-foreground">
            {title}
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>

        <span
          aria-hidden="true"
          className="shrink-0 text-lg text-muted-foreground transition-transform duration-200 group-hover:translate-x-1"
        >
          →
        </span>
      </div>
    </Link>
  );
}

// ==========================================================
// COMPONENTE PRINCIPAL
// ==========================================================

export default function AdminDashboard() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">

        {/* ==================================================
            HEADER
        ================================================== */}

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Credi Marketplace
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                Administración
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                Centro administrativo para supervisar usuarios, productos,
                vendedores, órdenes, afiliados y operaciones de la plataforma.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-2">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full bg-emerald-500"
              />

              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Área administrativa
              </span>
            </div>
          </div>
        </section>

        {/* ==================================================
            MÓDULOS
        ================================================== */}

        <section className="mt-8">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Gestión
            </p>

            <h2 className="mt-1 text-xl font-black tracking-tight text-foreground">
              Módulos administrativos
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

            <AdminCard
              href="/admin/users"
              title="Usuarios"
              description="Consulta y gestiona las cuentas de usuarios de la plataforma."
            />

            <AdminCard
              href="/admin/products"
              title="Productos"
              description="Supervisa publicaciones, catálogo y productos registrados."
            />

            <AdminCard
              href="/admin/orders"
              title="Órdenes"
              description="Consulta y supervisa las operaciones y pedidos."
            />

            <AdminCard
              href="/admin/sellers"
              title="Vendedores"
              description="Gestiona vendedores y actividad comercial."
            />

            <AdminCard
              href="/admin/affiliates"
              title="Afiliados"
              description="Supervisa afiliados y operaciones relacionadas."
            />

            <AdminCard
              href="/dashboard"
              title="Dashboard general"
              description="Regresa al panel general de tu cuenta."
            />

          </div>
        </section>

        {/* ==================================================
            SEGURIDAD
        ================================================== */}

        <section className="mt-8 rounded-3xl border border-amber-500/20 bg-amber-500/[0.04] p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
            Seguridad
          </p>

          <h2 className="mt-2 text-xl font-black text-foreground">
            Acceso administrativo protegido
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            El acceso a esta sección debe validarse en el servidor mediante
            <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              requireAdmin()
            </code>
            y las operaciones sobre Supabase deben permanecer protegidas
            mediante autorización y políticas RLS.
          </p>
        </section>

      </div>
    </main>
  );
}
```
