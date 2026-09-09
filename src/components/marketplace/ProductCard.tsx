import Image from "next/image";
import Link from "next/link";

import Badge from "@/components/ui/Badge";

interface MarketplaceProduct {
  id: string;
  name?: string | null;
  title?: string | null;
  slug?: string | null;
  description?: string | null;
  category?: string | null;
  price?: number | null;
  currency?: string | null;
  image?: string | null;
  image_url?: string | null;
  images?: string[] | null;
  badge?: string | null;
}

interface ProductCardProps {
  product: MarketplaceProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
  const productTitle = product.title?.trim() || product.name?.trim() || "Producto";
  const imageUrl = product.image?.trim() || product.image_url?.trim() || product.images?.find((value) => value?.trim()) || null;
  const productHref = `/products/${encodeURIComponent(product.id)}`;
  const hasPrice = typeof product.price === "number" && Number.isFinite(product.price);

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative flex h-48 items-center justify-center bg-slate-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={productTitle}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <span className="text-sm font-medium text-slate-400">Sin imagen</span>
        )}
      </div>

      <div className="space-y-3 p-5">
        {product.badge && <Badge variant="primary">{product.badge}</Badge>}
        <h3 className="text-lg font-semibold text-slate-900">{productTitle}</h3>
        {product.description && <p className="line-clamp-2 text-sm text-slate-600">{product.description}</p>}
        {hasPrice && <p className="text-xl font-bold text-blue-600">{product.currency ?? "$"}{product.price}</p>}

        <Link
          href={productHref}
          className="block rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Ver producto
        </Link>
      </div>
    </article>
  );
}
