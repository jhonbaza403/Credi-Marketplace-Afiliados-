'use client';

// ==========================================================
// ARCHIVO: src/features/marketplace/components/ProductCard.tsx
// Credi Marketplace
//
// Tarjeta reutilizable de producto
//
// Responsabilidades:
// - Presentación de productos
// - Visualización de imagen
// - Precio
// - Estado de inventario
// - Acción de compra
// - Accesibilidad
//
// IMPORTANTE:
// - No contiene lógica de pago.
// - No modifica inventario directamente.
// - No confía en datos del cliente para operaciones críticas.
// - La autorización y validación definitiva deben ejecutarse
//   en servidor y/o mediante Supabase RLS.
// ==========================================================

import Image from 'next/image';
import Link from 'next/link';

import type { Product } from '@/types/product';

// ==========================================================
// PROPS
// ==========================================================

export interface ProductCardProps {
  product: Product;

  /**
   * Callback opcional ejecutado cuando el usuario
   * intenta agregar el producto al carrito.
   *
   * La operación real debe validarse nuevamente
   * en servidor.
   */
  onAddToCart?: (product: Product) => void;

  /**
   * Permite deshabilitar la acción de compra.
   */
  disabled?: boolean;

  /**
   * Indica si debe mostrarse el botón de compra.
   */
  showBuyButton?: boolean;
}

// ==========================================================
// HELPERS
// ==========================================================

function formatPrice(
  price: number,
  currency = 'USD',
): string {
  if (!Number.isFinite(price) || price < 0) {
    return 'Precio no disponible';
  }

  try {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

// ==========================================================
// COMPONENT
// ==========================================================

export function ProductCard({
  product,
  onAddToCart,
  disabled = false,
  showBuyButton = true,
}: ProductCardProps) {
  const hasImage =
    Array.isArray(product.images) &&
    product.images.length > 0 &&
    typeof product.images[0] === 'string' &&
    product.images[0].trim().length > 0;

 const isAvailable =
  product.isActive &&
  product.stock > 0;

  const isOutOfStock =
    product.stock <= 0;

  const productHref = `/productos/${product.slug}`;

  const handleAddToCart = () => {
    if (
      disabled ||
      !isAvailable ||
      !onAddToCart
    ) {
      return;
    }

    onAddToCart(product);
  };

  return (
    <article
      className="
        group
        flex
        h-full
        flex-col
        overflow-hidden
        rounded-2xl
        border
        border-slate-200
        bg-white
        shadow-sm
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-slate-300
        hover:shadow-xl
        focus-within:ring-2
        focus-within:ring-blue-500
        focus-within:ring-offset-2
      "
    >
      {/* ======================================================
          IMAGEN
      ====================================================== */}

      <Link
        href={productHref}
        aria-label={`Ver ${product.title}`}
        className="relative block overflow-hidden bg-slate-100"
      >
        <div className="relative aspect-square w-full">
          {hasImage ? (
            <Image
              src={product.images[0]}
              alt={product.title}
              fill
              sizes="
                (max-width: 640px) 100vw,
                (max-width: 1024px) 50vw,
                25vw
              "
              className="
                object-cover
                transition-transform
                duration-500
                group-hover:scale-105
              "
            />
          ) : (
            <div
              className="
                flex
                h-full
                w-full
                items-center
                justify-center
                text-sm
                font-medium
                text-slate-400
              "
              aria-label="Producto sin imagen"
            >
              Sin imagen
            </div>
          )}

          {/* ==================================================
              ESTADO
          ================================================== */}

          {!isAvailable && (
            <div
              className="
                absolute
                inset-x-0
                bottom-0
                bg-slate-950/75
                px-3
                py-2
                text-center
                text-xs
                font-semibold
                uppercase
                tracking-wide
                text-white
                backdrop-blur-sm
              "
            >
              {isOutOfStock
                ? 'Agotado'
                : 'No disponible'}
            </div>
          )}
        </div>
      </Link>

      {/* ======================================================
          CONTENIDO
      ====================================================== */}

      <div className="flex flex-1 flex-col p-5">

        {/* ====================================================
            TÍTULO
        ==================================================== */}

        <Link
          href={productHref}
          className="
            line-clamp-2
            text-lg
            font-bold
            leading-6
            text-slate-900
            transition-colors
            hover:text-blue-600
            focus:outline-none
            focus-visible:text-blue-600
          "
        >
          {product.title}
        </Link>

        {/* ====================================================
            DESCRIPCIÓN
        ==================================================== */}

        {product.description && (
          <p
            className="
              mt-2
              line-clamp-2
              text-sm
              leading-5
              text-slate-500
            "
          >
            {product.description}
          </p>
        )}

        {/* ====================================================
            INVENTARIO
        ==================================================== */}

        <div className="mt-3 min-h-5">
          {isAvailable && product.stock <= 5 ? (
            <p
              className="
                text-xs
                font-semibold
                text-amber-600
              "
            >
              Últimas {product.stock} unidades
            </p>
          ) : isAvailable ? (
            <p
              className="
                text-xs
                font-medium
                text-emerald-600
              "
            >
              Disponible
            </p>
          ) : (
            <p
              className="
                text-xs
                font-medium
                text-slate-400
              "
            >
              No disponible
            </p>
          )}
        </div>

        {/* ====================================================
            PRECIO + ACCIÓN
        ==================================================== */}

        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-4">

            <div>
              <p className="text-xs font-medium text-slate-400">
                Precio
              </p>

              <p className="mt-1 text-xl font-black tracking-tight text-slate-950">
                {formatPrice(product.price)}
              </p>
            </div>

            {showBuyButton && (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={
                  disabled ||
                  !isAvailable ||
                  !onAddToCart
                }
                aria-disabled={
                  disabled ||
                  !isAvailable ||
                  !onAddToCart
                }
                className="
                  rounded-xl
                  bg-blue-600
                  px-4
                  py-2.5
                  text-sm
                  font-bold
                  text-white
                  shadow-sm
                  transition-all
                  duration-200
                  hover:bg-blue-700
                  hover:shadow-md
                  focus:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-blue-500
                  focus-visible:ring-offset-2
                  disabled:cursor-not-allowed
                  disabled:bg-slate-300
                  disabled:text-slate-500
                  disabled:shadow-none
                "
              >
                {isOutOfStock
                  ? 'Agotado'
                  : 'Comprar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
