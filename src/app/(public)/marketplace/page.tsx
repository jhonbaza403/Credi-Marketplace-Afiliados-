import type { Metadata } from "next";

import ProductCard from "@/features/marketplace/components/ProductCard";
import { getProducts } from "@/lib/database/queries";
import type { Product } from "@/types/product";

export const metadata: Metadata = {
  title: "Marketplace | Credi Marketplace",
  description: "Explora productos disponibles en Credi Marketplace.",
};

export const revalidate = 60;

export default async function MarketplacePage() {
  const data = await getProducts(50);

  const products: Product[] = data.map((row) => {
    const images = Array.isArray(row.images)
      ? row.images.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : [];
    const imageUrl = typeof row.image_url === "string" && row.image_url.trim().length > 0 ? row.image_url.trim() : null;

    return {
      id: row.id,
      storeId: row.store_id,
      categoryId: row.category_id ?? null,
      title: row.title,
      slug: row.slug,
      description: row.description ?? null,
      price: Number(row.price ?? 0),
      stock: Number(row.stock ?? 0),
      images: images.length > 0 ? images : imageUrl ? [imageUrl] : [],
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? null,
      store_id: row.store_id,
      category_id: row.category_id,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">Marketplace</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-foreground">Productos destacados</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Descubre productos publicados por vendedores de Credi Marketplace.
        </p>
      </header>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <h2 className="text-xl font-bold text-foreground">Catálogo disponible</h2>
          <p className="mt-2 text-muted-foreground">
            Aún no hay productos activos publicados. Los nuevos productos aparecerán aquí automáticamente.
          </p>
          <a
            href="/products"
            className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:opacity-90"
          >
            Ver productos
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      )}
    </main>
  );
}
