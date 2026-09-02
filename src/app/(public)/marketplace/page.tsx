```tsx
// ==========================================================
// ARCHIVO: src/app/marketplace/page.tsx
// Credi Marketplace
//
// Catálogo principal del Marketplace.
//
// Next.js 16.3
// React 19
//
// RESPONSABILIDADES:
// - Obtener productos activos desde Supabase Server.
// - Mostrar catálogo de productos.
// - Mantener renderizado en servidor.
// - Presentar estados de catálogo vacío/error.
// - Proporcionar una interfaz premium y responsive.
//
// ARQUITECTURA:
// - Server Component.
// - Supabase únicamente mediante createClient() del servidor.
// - No utiliza SERVICE_ROLE_KEY.
// - La seguridad real depende de RLS.
// ==========================================================

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Package,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";

import ProductCard from "@/features/marketplace/components/ProductCard";
import { createClient } from "@/lib/supabase/server";

import type { Product } from "@/types/product";

// ==========================================================
// 1. METADATA
// ==========================================================

export const metadata: Metadata = {
  title: "Marketplace | Credi Marketplace",
  description:
    "Explora productos de vendedores verificados en Credi Marketplace.",
};

// ==========================================================
// 2. CONFIGURACIÓN DE REVALIDACIÓN
// ==========================================================

export const revalidate = 60;

// ==========================================================
// 3. TIPO DE RESULTADO
// ==========================================================

type ProductsResult = {
  products: Product[];
  error: string | null;
};

// ==========================================================
// 4. OBTENER PRODUCTOS
// ==========================================================

async function getProducts(): Promise<ProductsResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "[MarketplacePage] Error cargando productos:",
        error.message,
      );

      return {
        products: [],
        error:
          "No fue posible cargar el catálogo en este momento.",
      };
    }

    return {
      products: (data ?? []) as Product[],
      error: null,
    };
  } catch (error: unknown) {
    console.error(
      "[MarketplacePage] Error inesperado:",
      error,
    );

    return {
      products: [],
      error:
        "Ocurrió un error inesperado al cargar el catálogo.",
    };
  }
}

// ==========================================================
// 5. PÁGINA PRINCIPAL
// ==========================================================

export default async function MarketplacePage() {
  const { products, error } = await getProducts();

  const productCount = products.length;

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* HERO */}

      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            -right-32
            -top-32
            size-96
            rounded-full
            bg-[var(--primary)]/10
            blur-3xl
          "
        />

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            -bottom-40
            -left-32
            size-96
            rounded-full
            bg-cyan-500/10
            blur-3xl
          "
        />

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">
              <Sparkles
                aria-hidden="true"
                className="size-3.5"
              />

              Marketplace
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl lg:leading-[1.05]">
              Compra y descubre
              <span className="block bg-linear-to-r from-brand-600 to-cyan-500 bg-clip-text text-transparent">
                productos increíbles.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
              Explora productos publicados por vendedores
              y comercios que forman parte de Credi
              Marketplace.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 shadow-sm">
                <Package
                  aria-hidden="true"
                  className="size-4 text-[var(--primary)]"
                />

                <span className="text-sm font-bold text-[var(--foreground)]">
                  {productCount}
                </span>

                <span className="text-sm text-[var(--muted)]">
                  {productCount === 1
                    ? "producto"
                    : "productos"}
                </span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 shadow-sm">
                <ShieldCheck
                  aria-hidden="true"
                  className="size-4 text-emerald-500"
                />

                <span className="text-sm font-semibold text-[var(--foreground)]">
                  Vendedores verificados
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENIDO */}

      <section
        aria-labelledby="catalog-title"
        className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12"
      >
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Store
                aria-hidden="true"
                className="size-5 text-[var(--primary)]"
              />

              <h2
                id="catalog-title"
                className="text-2xl font-black tracking-tight text-[var(--foreground)] sm:text-3xl"
              >
                Productos destacados
              </h2>
            </div>

            <p className="mt-2 text-sm text-[var(--muted)] sm:text-base">
              Explora nuestro catálogo y encuentra lo que
              necesitas.
            </p>
          </div>

          <Link
            href="/productos"
            className="
              inline-flex
              items-center
              gap-2
              self-start
              rounded-xl
              border
              border-[var(--border)]
              bg-[var(--surface)]
              px-4
              py-2.5
              text-sm
              font-bold
              text-[var(--foreground)]
              shadow-sm
              transition-all
              hover:-translate-y-0.5
              hover:bg-[var(--surface-secondary)]
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[var(--primary)]
              focus-visible:ring-offset-2
            "
          >
            Ver catálogo

            <ArrowRight
              aria-hidden="true"
              className="size-4"
            />
          </Link>
        </div>

        {error ? (
          <div
            role="alert"
            className="
              rounded-2xl
              border
              border-red-500/20
              bg-red-500/5
              p-8
              text-center
            "
          >
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
              <Package
                aria-hidden="true"
                className="size-6"
              />
            </div>

            <h3 className="mt-4 text-lg font-black text-[var(--foreground)]">
              No pudimos cargar el catálogo
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              {error}
            </p>

            <Link
              href="/marketplace"
              className="
                mt-6
                inline-flex
                items-center
                gap-2
                rounded-xl
                bg-[var(--primary)]
                px-5
                py-2.5
                text-sm
                font-bold
                text-white
                transition-opacity
                hover:opacity-90
              "
            >
              Intentar nuevamente

              <ArrowRight
                aria-hidden="true"
                className="size-4"
              />
            </Link>
          </div>
        ) : productCount === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface-secondary)] px-6 py-16 text-center sm:px-12">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
              <Package
                aria-hidden="true"
                className="size-8"
              />
            </div>

            <h3 className="mt-6 text-2xl font-black text-[var(--foreground)]">
              El catálogo está comenzando
            </h3>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--muted)] sm:text-base">
              Actualmente no hay productos activos
              publicados. Vuelve pronto para descubrir
              nuevas oportunidades.
            </p>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/"
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-[var(--border)]
                  bg-[var(--surface)]
                  px-5
                  py-3
                  text-sm
                  font-bold
                  text-[var(--foreground)]
                  shadow-sm
                  transition-colors
                  hover:bg-[var(--surface-secondary)]
                "
              >
                Volver al inicio
              </Link>

              <Link
                href="/auth/register"
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-[var(--primary)]
                  px-5
                  py-3
                  text-sm
                  font-bold
                  text-white
                  shadow-lg
                  transition-all
                  hover:-translate-y-0.5
                  hover:bg-[var(--primary-hover)]
                "
              >
                Crear cuenta

                <ArrowRight
                  aria-hidden="true"
                  className="size-4"
                />
              </Link>
            </div>
          </div>
        ) : (
          <div
            className="
              grid
              grid-cols-1
              gap-5
              sm:grid-cols-2
              lg:grid-cols-3
              xl:grid-cols-4
            "
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        )}

        {!error && productCount > 0 && (
          <div className="mt-12 grid grid-cols-1 gap-4 border-t border-[var(--border)] pt-8 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-secondary)] p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <CheckCircle2
                  aria-hidden="true"
                  className="size-5"
                />
              </div>

              <div>
                <p className="text-sm font-black text-[var(--foreground)]">
                  Productos activos
                </p>

                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  Catálogo actualizado
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-secondary)] p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                <ShieldCheck
                  aria-hidden="true"
                  className="size-5"
                />
              </div>

              <div>
                <p className="text-sm font-black text-[var(--foreground)]">
                  Plataforma segura
                </p>

                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  Protección de datos y acceso
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-secondary)] p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <Store
                  aria-hidden="true"
                  className="size-5"
                />
              </div>

              <div>
                <p className="text-sm font-black text-[var(--foreground)]">
                  Marketplace global
                </p>

                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  Conecta compradores y vendedores
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
```
