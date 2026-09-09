import type { Metadata } from "next";
import Link from "next/link";

import ProductCard from "@/features/marketplace/components/ProductCard";
import { getProducts } from "@/lib/database/queries";
import type { Product } from "@/types/product";

export const metadata: Metadata = {
  title: "Productos | Credi Marketplace",
  description: "Explora productos disponibles en Credi Marketplace.",
};

export const revalidate = 60;

function normalizeImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const result: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim().length > 0) {
      result.push(item.trim());
    }
  }
  return result;
}

export default async function ProductsPage() {
  const data = await getProducts(50);

  const products: Product[] = data.map((row) => {
    const images = normalizeImages(row.images);
    const imageUrl =
      typeof row.image_url === "string" && row.image_url.trim().length > 0
        ? row.image_url.trim()
        : null;

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
    <main className="min-h-screen bg-background">
      <section className="container mx-auto px-6 py-10">
        <header className="mb-10">
          <h1 className="text-4xl font-bold">Productos</h1>
          <p className="mt-3 text-muted-foreground">
            Explora productos disponibles en Credi Marketplace.
          </p>
        </header>

        {products.length === 0 ? (
          <div className="rounded-xl border p-8 text-center">
            <p className="text-muted-foreground">No existen productos disponibles.</p>
            <Link
              href="/marketplace"
              className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 font-medium text-white hover:opacity-90"
            >
              Ir al Marketplace
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
