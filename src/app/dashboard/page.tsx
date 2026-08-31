```tsx
"use client";

import Link from "next/link";

export default function AdminDashboard() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Credi Marketplace
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">
                Administración
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Centro administrativo de la plataforma para gestionar usuarios,
                productos, vendedores, órdenes y operaciones.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                ACCESO AUTORIZADO
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AdminCard
            href="/admin/users"
            title="Usuarios"
            description="Gestiona usuarios y permisos de la plataforma."
          />

          <AdminCard
            href="/admin/products"
            title="Productos"
            description="Supervisa productos, publicaciones y catálogo."
          />

          <AdminCard
            href="/admin/orders"
            title="Órdenes"
            description="Consulta y administra las operaciones de compra."
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
            title="Dashboard"
            description="Volver al panel general de la cuenta."
          />
        </section>
      </div>
    </main>
  );
}

interface AdminCardProps {
  href: string;
  title: string;
  description: string;
}

function AdminCard({ href, title, description }: AdminCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-border bg-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-foreground">
            {title}
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>

        <span
          aria-hidden="true"
          className="text-lg text-muted-foreground transition-transform duration-200 group-hover:translate-x-1"
        >
          →
        </span>
      </div>
    </Link>
  );
}
```
