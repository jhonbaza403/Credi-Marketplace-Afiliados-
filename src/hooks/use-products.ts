"use client";

import { useCallback, useState } from "react";

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
      const response = await fetch("/api/products", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("No fue posible cargar los productos");
      }

      const data: unknown = await response.json();

      if (
        typeof data === "object" &&
        data !== null &&
        "products" in data &&
        Array.isArray((data as { products?: unknown }).products)
      ) {
        setProducts(
          (data as { products: ProductSummary[] }).products,
        );
      } else {
        setProducts([]);
      }
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
