import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ProductCard from '@/features/marketplace/components/ProductCard';
import type { Product } from '@/types/product';

export const metadata: Metadata = {
  title: 'Marketplace | Credi Marketplace',
  description: 'Explora productos disponibles en Credi Marketplace.',
};

export const revalidate = 60;

export default async function MarketplacePage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  const products: Product[] = (data ?? []).map((row) => ({
    id: row.id,
    storeId: row.store_id ?? row.storeId,
    categoryId: row.category_id ?? row.categoryId ?? null,
    title: row.title,
    slug: row.slug,
    description: row.description ?? null,
    price: Number(row.price ?? 0),
    stock: Number(row.stock ?? 0),
    images: Array.isArray(row.images) ? row.images : [],
    isActive: row.is_active ?? row.isActive ?? true,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
    store_id: row.store_id,
    category_id: row.category_id,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  })) as Product[];

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">Marketplace</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-foreground">Productos destacados</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Descubre productos publicados por vendedores de Credi Marketplace.</p>
      </header>

      {error ? (
        <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-destructive">
          No fue posible cargar el catálogo en este momento.
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No hay productos activos disponibles actualmente.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
