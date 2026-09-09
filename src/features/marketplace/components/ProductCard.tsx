'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Product } from '@/types/product';
import ProductShare from './ProductShare';

export interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  disabled?: boolean;
  showBuyButton?: boolean;
}

function formatPrice(price: number, currency = 'USD'): string {
  if (!Number.isFinite(price) || price < 0) return 'Precio no disponible';

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

export function ProductCard({
  product,
  onAddToCart,
  disabled = false,
  showBuyButton = true,
}: ProductCardProps) {
  const searchParams = useSearchParams();
  const affiliateRef = searchParams.get('ref')?.trim() || null;
  const image = Array.isArray(product.images)
    ? product.images.find((value: string) => value.trim().length > 0)
    : undefined;
  const isAvailable = Boolean(product.isActive) && product.stock > 0;
  const productHref = `/products/${encodeURIComponent(product.id)}`;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl focus-within:ring-2 focus-within:ring-blue-500">
      <Link href={productHref} aria-label={`Ver ${product.title}`} className="relative block aspect-square overflow-hidden bg-slate-100">
        {image ? (
          <Image
            src={image}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized={image.startsWith('http') && !image.includes('.supabase.co/')}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400" aria-label="Producto sin imagen">
            Sin imagen
          </div>
        )}
        {!isAvailable && (
          <div className="absolute inset-x-0 bottom-0 bg-slate-950/75 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-white">
            {product.stock <= 0 ? 'Agotado' : 'No disponible'}
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <Link href={productHref} className="line-clamp-2 text-lg font-bold leading-6 text-slate-900 hover:text-blue-600">
          {product.title}
        </Link>
        {product.description && <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">{product.description}</p>}

        <div className="mt-3 min-h-5">
          {isAvailable ? (
            <p className="text-xs font-semibold text-emerald-600">
              {product.stock <= 5 ? `Últimas ${product.stock} unidades` : 'Disponible'}
            </p>
          ) : (
            <p className="text-xs font-medium text-slate-400">No disponible</p>
          )}
        </div>

        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-slate-400">Precio</p>
              <p className="mt-1 text-xl font-black tracking-tight text-slate-950">{formatPrice(product.price)}</p>
            </div>
            {showBuyButton && (
              <button
                type="button"
                onClick={() => onAddToCart?.(product)}
                disabled={disabled || !isAvailable || !onAddToCart}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
              >
                {product.stock <= 0 ? 'Agotado' : 'Comprar'}
              </button>
            )}
          </div>
        </div>

        <ProductShare
          productId={product.id}
          title={product.title}
          description={product.description}
          affiliateRef={affiliateRef}
        />
      </div>
    </article>
  );
}

export default ProductCard;
