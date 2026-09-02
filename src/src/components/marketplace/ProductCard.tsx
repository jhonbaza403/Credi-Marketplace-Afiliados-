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
  badge?: string | null;
}

interface ProductCardProps {
  product: MarketplaceProduct;
}

export default function ProductCard({
  product,
}: ProductCardProps) {
  const productTitle =
    product.title?.trim() || product.name?.trim() || "Producto";

  const productSlug =
    product.slug?.trim() || product.id;

  const imageUrl =
    product.image?.trim() || product.image_url?.trim() || null;

  const hasPrice =
    typeof product.price === "number" &&
    Number.isFinite(product.price);

  return (
    <article className="overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-lg">
      <div className="relative flex h-48 items-center justify-center bg-gray-100">
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
          <span className="text-gray-400">Sin imagen</span>
        )}
      </div>

      <div className="space-y-3 p-5">
        {product.badge && (
          <Badge variant="primary">{product.badge}</Badge>
        )}

        <h3 className="text-lg font-semibold text-gray-900">
          {productTitle}
        </h3>

        {product.description && (
          <p className="line-clamp-2 text-sm text-gray-600">
            {product.description}
          </p>
        )}

        {hasPrice && (
          <p className="text-xl font-bold text-blue-600">
            {product.currency ?? "$"}
            {product.price}
          </p>
        )}

        <Link
          href={`/marketplace/products/${productSlug}`}
          className="block rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-700"
        >
          Ver producto
        </Link>
      </div>
    </article>
  );
}
