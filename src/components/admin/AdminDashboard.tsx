```tsx
"use client";

// ==========================================================
// ARCHIVO:
// src/components/admin/AdminDashboard.tsx
//
// Credi Marketplace
//
// Dashboard administrativo principal
//
// Next.js 16 App Router
// TypeScript
// Tailwind CSS v4
// ==========================================================

import type { ReactNode } from "react";
import Link from "next/link";

import {
  Activity,
  ArrowRight,
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Package,
  ShieldCheck,
  ShoppingCart,
  Store,
  Users,
  UserCog,
  WalletCards,
} from "lucide-react";

// ==========================================================
// TIPOS
// ==========================================================

interface AdminCardProps {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}

interface AdminStatProps {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
}

// ==========================================================
// TARJETA ADMINISTRATIVA
// ==========================================================

function AdminCard({
  href,
  title,
  description,
  icon,
}: AdminCardProps) {
  return (
    <Link
      href={href}
      className="
        group
        relative
        overflow-hidden
        rounded-2xl
        border
        border-border
        bg-card
        p-6
        shadow-sm
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:shadow-lg
        focus:outline-none
        focus:ring-2
        focus:ring-primary
        focus:ring-offset-2
      "
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className="
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-primary/10
            text-primary
          "
          aria-hidden="true"
        >
          {icon}
        </div>

        <ArrowRight
          className="
            h-5
            w-5
            shrink-0
            text-muted-foreground
            transition-transform
            duration-200
            group-hover:translate-x-1
          "
          aria-hidden="true"
        />
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

// ==========================================================
// ESTADÍSTICA
// ==========================================================

function AdminStat({
  label,
  value,
  description,
  icon,
}: AdminStatProps) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-border
        bg-card
        p-5
        shadow-sm
      "
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>

          <p className="mt-2 text-2xl font-black tracking-tight text-foreground">
            {value}
          </p>
        </div>

        <div
          className="
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-xl
            bg-muted
            text-muted-foreground
          "
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
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
            ENCABEZADO
        ================================================== */}

        <section
          className="
            relative
            overflow-hidden
            rounded-3xl
            border
            border-border
            bg-card
            shadow-sm
          "
        >
          <div
            className="
              absolute
              inset-0
              bg-gradient-to-br
              from-primary/[0.08]
              via-transparent
              to-transparent
            "
            aria-hidden="true"
          />

          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex items-start gap-4 sm:gap-5">
                <div
                  className="
                    flex
                    h-14
                    w-14
                    shrink-0
                    items-center
                    justify-center
                    rounded-2xl
                    bg-primary
                    text-primary-foreground
                    shadow-lg
                    sm:h-16
                    sm:w-16
                  "
                  aria-hidden="true"
                >
                  <ShieldCheck className="h-7 w-7 sm:h-8 sm:w-8" />
                </div>

                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className="
                        inline-flex
                        items-center
                        rounded-full
                        border
                        border-primary/20
                        bg-primary/10
                        px-3
                        py-1
                        text-[11px]
                        font-bold
                        uppercase
                        tracking-wider
                        text-primary
                      "
                    >
                      Credi Marketplace
                    </span>

                    <span
                      className="
                        inline-flex
                        items-center
                        rounded-full
                        border
                        border-border
                        bg-muted
                        px-3
                        py-1
                        text-[11px]
                        font-bold
                        uppercase
                        tracking-wider
                        text-muted-foreground
                      "
                    >
                      Administración
                    </span>
                  </div>

                  <h1
                    className="
                      text-2xl
                      font-black
                      tracking-tight
                      text-foreground
                      sm:text-3xl
                      lg:text-4xl
                    "
                  >
                    Centro administrativo
                  </h1>

                  <p
                    className="
                      mt-3
                      max-w-2xl
                      text-sm
                      leading-6
                      text-muted-foreground
                      sm:text-base
                    "
                  >
                    Supervisa y administra las principales operaciones
                    de Credi Marketplace desde un único centro de control.
                  </p>
                </div>
              </div>

              <div
                className="
                  inline-flex
                  w-fit
                  shrink-0
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-emerald-500/20
                  bg-emerald-500/5
                  px-4
                  py-2
                "
              >
                <span
                  className="h-2.5 w-2.5 rounded-full bg-emerald-500"
                  aria-hidden="true"
                />

                <span
                  className="
                    text-xs
                    font-bold
                    uppercase
                    tracking-wider
                    text-emerald-600
                    dark:text-emerald-400
                  "
                >
                  Sistema protegido
                </span>
              </div>

            </div>
          </div>
        </section>

        {/* ==================================================
            RESUMEN
        ================================================== */}

        <section className="mt-8">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Resumen
            </p>

            <h2 className="mt-1 text-xl font-black tracking-tight text-foreground">
              Estado de la plataforma
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <AdminStat
              label="Usuarios"
              value="—"
              description="Consulta el módulo de usuarios para obtener los datos actuales."
              icon={<Users className="h-5 w-5" />}
            />

            <AdminStat
              label="Productos"
              value="—"
              description="Consulta el catálogo y las publicaciones registradas."
              icon={<Package className="h-5 w-5" />}
            />

            <AdminStat
              label="Órdenes"
              value="—"
              description="Supervisa las operaciones y pedidos de la plataforma."
              icon={<ShoppingCart className="h-5 w-5" />}
            />

            <AdminStat
              label="Vendedores"
              value="—"
              description="Gestiona vendedores y actividad comercial."
              icon={<Store className="h-5 w-5" />}
            />

          </div>
        </section>

        {/* ==================================================
            GESTIÓN PRINCIPAL
        ================================================== */}

        <section className="mt-10">
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
              description="Consulta usuarios, perfiles, estados y permisos de las cuentas."
              icon={<Users className="h-5 w-5" />}
            />

            <AdminCard
              href="/admin/products"
              title="Productos"
              description="Gestiona publicaciones, catálogo, inventario y productos."
              icon={<Package className="h-5 w-5" />}
            />

            <AdminCard
              href="/admin/orders"
              title="Órdenes"
              description="Consulta y supervisa las operaciones de compra y pedidos."
              icon={<ClipboardList className="h-5 w-5" />}
            />

            <AdminCard
              href="/admin/sellers"
              title="Vendedores"
              description="Gestiona vendedores, tiendas y actividad comercial."
              icon={<Store className="h-5 w-5" />}
            />

            <AdminCard
              href="/admin/affiliates"
              title="Afiliados"
              description="Supervisa afiliados, referencias y actividad de afiliación."
              icon={<WalletCards className="h-5 w-5" />}
            />

            <AdminCard
              href="/admin/analytics"
              title="Analítica"
              description="Consulta métricas y datos agregados de la plataforma."
              icon={<BarChart3 className="h-5 w-5" />}
            />

          </div>
        </section>

        {/* ==================================================
            SISTEMA
        ================================================== */}

        <section className="mt-10">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Sistema
            </p>

            <h2 className="mt-1 text-xl font-black tracking-tight text-foreground">
              Herramientas de administración
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

            <AdminCard
              href="/admin/roles"
              title="Roles y permisos"
              description="Gestiona la estructura de autorización administrativa."
              icon={<UserCog className="h-5 w-5" />}
            />

            <AdminCard
              href="/admin/activity"
              title="Actividad"
              description="Consulta actividad administrativa y eventos relevantes."
              icon={<Activity className="h-5 w-5" />}
            />

            <AdminCard
              href="/admin/settings"
              title="Configuración"
              description="Gestiona las configuraciones disponibles para administración."
              icon={<LayoutDashboard className="h-5 w-5" />}
            />

            <AdminCard
              href="/admin/inventory"
              title="Inventario"
              description="Supervisa existencias y operaciones relacionadas con inventario."
              icon={<Boxes className="h-5 w-5" />}
            />

          </div>
        </section>

        {/* ==================================================
            SEGURIDAD
        ================================================== */}

        <section
          className="
            mt-10
            rounded-3xl
            border
            border-amber-500/20
            bg-amber-500/[0.04]
            p-6
            sm:p-8
          "
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

            <div>
              <p
                className="
                  text-xs
                  font-bold
                  uppercase
                  tracking-[0.18em]
                  text-amber-600
                  dark:text-amber-400
                "
              >
                Seguridad
              </p>

              <h2 className="mt-2 text-xl font-black text-foreground">
                Administración protegida
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Esta interfaz no debe considerarse una barrera de seguridad
                por sí misma. El acceso administrativo debe validarse en el
                servidor mediante{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  requireAdmin()
                </code>{" "}
                y las operaciones de datos deben permanecer protegidas por
                autorización del servidor y políticas RLS de Supabase.
              </p>
            </div>

            <div
              className="
                flex
                shrink-0
                items-center
                gap-2
                rounded-xl
                border
                border-border
                bg-card
                px-4
                py-3
              "
            >
              <ShieldCheck
                className="h-5 w-5 text-primary"
                aria-hidden="true"
              />

              <span className="text-xs font-bold text-foreground">
                Server Side Auth
              </span>
            </div>

          </div>
        </section>

        {/* ==================================================
            ACCIONES
        ================================================== */}

        <section className="mt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">

            <Link
              href="/dashboard"
              className="
                inline-flex
                items-center
                justify-center
                rounded-xl
                border
                border-border
                bg-background
                px-5
                py-3
                text-sm
                font-bold
                text-foreground
                transition-colors
                hover:bg-muted
                focus:outline-none
                focus:ring-2
                focus:ring-primary
                focus:ring-offset-2
              "
            >
              Dashboard general
            </Link>

            <Link
              href="/marketplace"
              className="
                inline-flex
                items-center
                justify-center
                rounded-xl
                bg-primary
                px-5
                py-3
                text-sm
                font-bold
                text-primary-foreground
                shadow-sm
                transition-opacity
                hover:opacity-90
                focus:outline-none
                focus:ring-2
                focus:ring-primary
                focus:ring-offset-2
              "
            >
              Ver Marketplace

              <ArrowRight
                className="ml-2 h-4 w-4"
                aria-hidden="true"
              />
            </Link>

          </div>
        </section>

      </div>
    </main>
  );
}
```
