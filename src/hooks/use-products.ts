"use client";

import { useCallback, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { ProductSummary } from "@/types/product";

interface UseProductsOptions {
  initialProducts?: ProductSummary[];
}

interface UseProductsResult {
  products: ProductSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

type ProductRow = {
  id: string;
  store_id: string;
  category_id: string | null;
  title: string;
  slug: string;
  price: number;
  stock: number;
  images: string[] | null;
  is_active: boolean;
};

export function useProducts(
  options: UseProductsOptions = {},
): UseProductsResult {
  const [products, setProducts] = useState<ProductSummary[]>(
    options.initialProducts ?? [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: queryError } = await supabase
        .from("published_products")
        .select(
          "id,store_id,category_id,title,slug,price,stock,images,is_active",
        )
        .eq("is_active", true)
        .gt("stock", 0)
        .order("updated_at", { ascending: false })
        .limit(100);

      if (queryError) throw queryError;

      const rows = (data ?? []) as ProductRow[];
      setProducts(
        rows.map((row): ProductSummary => ({
          id: row.id,
          storeId: row.store_id,
          categoryId: row.category_id,
          title: row.title,
          slug: row.slug,
          price: row.price,
          stock: row.stock,
          images: row.images ?? [],
          isActive: row.is_active,
        })),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error desconocido",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    products,
    loading,
    error,
    refresh,
  };
}
