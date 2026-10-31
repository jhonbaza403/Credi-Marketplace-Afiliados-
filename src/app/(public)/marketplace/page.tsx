import type { Metadata } from "next";
import DomainBridge from "@/components/portal/DomainBridge";
import MarketplaceCatalog from "@/components/marketplace/MarketplaceCatalog";
import { getProducts } from "@/lib/database/queries";
import type { Product } from "@/types/product";

export const metadata: Metadata = {
  title: "Marketplace | Credi Marketplace",
  description: "Compra, vende, compara productos y conecta con comerciantes en Credi Marketplace.",
  alternates: { canonical: "/marketplace" },
};

export const revalidate = 60;

function collectImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0).map((candidate) => candidate.trim());
}

export default async function MarketplacePage() {
  const data = await getProducts(100);
  const products: Product[] = data.map((row) => {
    const images = collectImageUrls(row.images);
    const imageUrl = typeof row.image_url === "string" && row.image_url.trim() ? row.image_url.trim() : null;
    return {
      id: row.id,
      storeId: row.store_id,
      categoryId: row.category_id ?? null,
      title: row.title,
      slug: row.slug,
      description: row.description ?? null,
      price: Number(row.price ?? 0),
      stock: Number(row.stock ?? 0),
      images: images.length ? images : imageUrl ? [imageUrl] : [],
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
    <>
      <DomainBridge context="marketplace" />
      <MarketplaceCatalog products={products} />
    </>
  );
}
