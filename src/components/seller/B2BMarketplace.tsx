"use client";

import { useEffect } from "react";

import {
  useAuth,
} from "@/i18n/hooks/use-auth";
import {
  useCart,
} from "@/i18n/hooks/use-cart";
import {
  useProducts,
} from "@/i18n/hooks/use-products";
import {
  useUser,
} from "@/i18n/hooks/use-user";

export default function B2BMarketplace() {
  const { profile, isAdmin, loading: authLoading } = useAuth();
  const { user, isAuthenticated } = useUser();
  const { products, loading, error, refresh } = useProducts();
  const { addToCart, totalItems } = useCart();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const displayName =
    profile?.fullName ?? profile?.full_name ?? user?.email ?? "Cliente";

  const canAccessB2B =
    isAdmin ||
    profile?.role === "company" ||
    profile?.role === "vendor";

  if (authLoading) {
    return (
      <section aria-busy="true" className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-neutral-200" />
        <div className="h-24 animate-pulse rounded-xl bg-neutral-100" />
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Marketplace B2B
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Inicia sesión para consultar productos y operar dentro del canal B2B.
        </p>
      </section>
    );
  }

  if (!canAccessB2B) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-2xl font-semibold text-amber-950">
          Acceso B2B restringido
        </h1>
        <p className="mt-2 text-sm text-amber-900">
          Tu cuenta puede comprar en Credi Marketplace, pero no tiene habilitado
          el espacio empresarial B2B.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">B2B Credi</p>
          <h1 className="text-2xl font-semibold text-neutral-950">
            Hola, {displayName}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Compra para tu empresa y gestiona el catálogo disponible en Credi.
          </p>
        </div>
        <div className="rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-700">
          Carrito: {totalItems}
        </div>
      </header>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            Productos disponibles
          </h2>
          <p className="text-sm text-neutral-500">
            Precios y stock según la respuesta actual del marketplace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Actualizando…" : "Actualizar"}
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      ) : null}

      {loading && products.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          Cargando productos…
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
          <h3 className="font-medium text-neutral-900">
            No hay productos disponibles
          </h3>
          <p className="mt-1 text-sm text-neutral-600">
            El catálogo B2B no tiene productos para mostrar en este momento.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const image = product.images?.[0] ?? null;
            const canAdd = product.isActive && product.stock > 0;

            return (
              <article
                key={product.id}
                className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
              >
                {image ? (
                  <img
                    src={image}
                    alt={product.title}
                    loading="lazy"
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="aspect-video w-full bg-neutral-100" />
                )}

                <div className="space-y-3 p-5">
                  <div>
                    <h3 className="font-semibold text-neutral-900">
                      {product.title}
                    </h3>
                    <p className="mt-1 text-lg font-bold text-neutral-950">
                      {new Intl.NumberFormat("es-VE", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 2,
                      }).format(product.price)}
                    </p>
                  </div>

                  <p className="text-xs text-neutral-500">
                    Stock disponible: {Math.max(0, product.stock)}
                  </p>

                  <button
                    type="button"
                    disabled={!canAdd}
                    onClick={() =>
                      addToCart({
                        id: product.id,
                        name: product.title,
                        price: product.price,
                        quantity: 1,
                        image,
                      })
                    }
                    className="w-full rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
                  >
                    {canAdd ? "Añadir al carrito" : "No disponible"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
