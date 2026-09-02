// ==========================================================
// ARCHIVO:
// src/app/(public)/marketplace/products/[slug]/page.tsx
//
// Credi Marketplace
//
// Detalle público de producto
//
// Next.js 16.3
// React 19
// TypeScript
// Supabase Server
// ==========================================================

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// ==========================================================
// TIPOS
// ==========================================================

interface ProductRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  images: string[] | null;
  is_active: boolean;
}

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

// ==========================================================
// OBTENER PRODUCTO
// ==========================================================

async function getProduct(
  slug: string,
): Promise<ProductRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      "id,title,slug,description,price,stock,images,is_active",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error(
      "[ProductPage] Product lookup failed:",
      error.message,
    );

    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    description: data.description,
    price: Number(data.price),
    stock: Number(data.stock),
    images: Array.isArray(data.images)
      ? data.images.filter(
          (image): image is string =>
            typeof image === "string" &&
            image.trim().length > 0,
        )
      : null,
    is_active: Boolean(data.is_active),
  };
}

// ==========================================================
// METADATA
// ==========================================================

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: "Producto no encontrado | Credi Marketplace",
      description:
        "El producto solicitado no está disponible.",
    };
  }

  return {
    title: `${product.title} | Credi Marketplace`,
    description:
      product.description?.slice(0, 160) ??
      "Producto disponible en Credi Marketplace.",
  };
}

// ==========================================================
// PÁGINA
// ==========================================================

export default async function ProductPage({
  params,
}: Props) {
  const { slug } = await params;

  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const image = product.images?.[0] ?? null;
  const available = product.stock > 0;

  const formattedPrice = new Intl.NumberFormat(
    "es-VE",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(product.price);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      {/* ==================================================
          NAVEGACIÓN
      ================================================== */}

      <Link
        href="/marketplace"
        className="
          inline-flex
          items-center
          gap-2
          text-sm
          font-semibold
          text-brand-600
          transition-colors
          hover:text-brand-700
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-brand-600
          focus-visible:ring-offset-2
        "
      >
        ← Marketplace
      </Link>

      {/* ==================================================
          DETALLE DEL PRODUCTO
      ================================================== */}

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        {/* ==================================================
            IMAGEN
        ================================================== */}

        <section
          aria-label="Imagen del producto"
          className="
            overflow-hidden
            rounded-3xl
            border
            border-marketplace-border
            bg-white
          "
        >
          {image ? (
            <div className="relative aspect-square w-full">
              <Image
                src={image}
                alt={product.title}
                fill
                priority
                sizes="
                  (max-width: 1024px) 100vw,
                  50vw
                "
                className="object-cover"
              />
            </div>
          ) : (
            <div
              className="
                flex
                aspect-square
                w-full
                items-center
                justify-center
                bg-neutral-100
                text-sm
                font-medium
                text-neutral-500
              "
            >
              Imagen no disponible
            </div>
          )}
        </section>

        {/* ==================================================
            INFORMACIÓN
        ================================================== */}

        <section>
          <p className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Producto
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight text-neutral-950">
            {product.title}
          </h1>

          <p className="mt-5 text-3xl font-black text-brand-600">
            {formattedPrice}
          </p>

          <p className="mt-6 leading-7 text-neutral-600">
            {product.description ??
              "Producto disponible en Credi Marketplace."}
          </p>

          <div
            className="
              mt-6
              rounded-2xl
              border
              border-neutral-200
              bg-neutral-50
              p-4
            "
          >
            <p
              className={
                available
                  ? "text-sm font-semibold text-emerald-700"
                  : "text-sm font-semibold text-red-600"
              }
            >
              {available
                ? `${product.stock} unidades disponibles`
                : "Agotado"}
            </p>
          </div>

          {/* ==================================================
              ACCIÓN
          ================================================== */}

          <div className="mt-8">
            {available ? (
              <Link
                href="/cart"
                className="
                  inline-flex
                  w-full
                  items-center
                  justify-center
                  rounded-xl
                  bg-brand-600
                  px-5
                  py-3
                  text-sm
                  font-bold
                  text-white
                  transition-colors
                  hover:bg-brand-700
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-brand-600
                  focus-visible:ring-offset-2
                "
              >
                Ir al carrito
              </Link>
            ) : (
              <span
                className="
                  inline-flex
                  w-full
                  items-center
                  justify-center
                  rounded-xl
                  bg-neutral-200
                  px-5
                  py-3
                  text-sm
                  font-bold
                  text-neutral-500
                "
              >
                Producto agotado
              </span>
            )}
          </div>

          {/* ==================================================
              IDENTIFICADOR
          ================================================== */}

          <div className="mt-8 border-t border-neutral-200 pt-6">
            <p className="text-xs text-neutral-500">
              Referencia
            </p>

            <p className="mt-1 break-all text-sm font-medium text-neutral-700">
              {product.slug}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
```
