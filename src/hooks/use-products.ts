"use client";

import { useCallback, useState } from "react";

import { buildSearchOrFilter } from "@/lib/search/postgrest-filter";
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
      const search = buildSearchOrFilter(
        ["title", "description"],
        "",
      );

      let query = supabase
        .from("published_products")
        .select(
          "id,title,slug,description,price,stock,image_url,images,is_active,updated_at",
        )
        .eq("is_active", true)
        .gt("stock", 0)
        .order("updated_at", { ascending: false })
        .limit(100);

      if (search) query = query.or(search);

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;

      setProducts((data ?? []) as ProductSummary[]);
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
