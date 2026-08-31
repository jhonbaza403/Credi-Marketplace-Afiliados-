// ==========================================================
// ARCHIVO: src/types/product.ts
// Tipos de productos, tiendas y categorías
// Credi Marketplace
// ==========================================================

/**
 * ==========================================================
 * STORE
 * ==========================================================
 *
 * Representación de una tienda proveniente de public.stores.
 *
 * IMPORTANTE:
 * PostgreSQL utiliza snake_case, pero la aplicación Next.js
 * trabaja con camelCase.
 *
 * La conversión debe hacerse en la capa de consulta/adaptador
 * cuando sea necesaria.
 */
export interface Store {
  /** UUID de la tienda */
  id: string;

  /** UUID del usuario propietario */
  vendorId: string;

  /** Nombre comercial */
  storeName: string;

  /** Identificador URL amigable */
  slug: string;

  /** Descripción comercial */
  description?: string | null;

  /** Indica si la tienda está verificada */
  isVerified: boolean;

  /** Fecha de creación ISO */
  createdAt: string;

  /** Fecha de actualización ISO */
  updatedAt?: string | null;
}

/**
 * ==========================================================
 * CATEGORY
 * ==========================================================
 *
 * Representa public.categories.
 *
 * parentId permite construir categorías jerárquicas:
 *
 * Categoría
 * ├── Subcategoría
 * │   └── Sub-subcategoría
 *
 * children NO es una columna de PostgreSQL.
 * Es una propiedad calculada por la aplicación.
 */
export interface Category {
  /** UUID de la categoría */
  id: string;

  /** Nombre de la categoría */
  name: string;

  /** Identificador URL amigable */
  slug: string;

  /** UUID de la categoría padre */
  parentId?: string | null;

  /** Subcategorías calculadas */
  children?: Category[];

  /** Fecha de creación ISO */
  createdAt?: string;

  /** Fecha de actualización ISO */
  updatedAt?: string | null;
}

/**
 * ==========================================================
 * PRODUCT
 * ==========================================================
 *
 * Representa public.products.
 */
export interface Product {
  /** UUID del producto */
  id: string;

  /** UUID de la tienda */
  storeId: string;

  /** UUID de la categoría */
  categoryId?: string | null;

  /** Nombre/título comercial */
  title: string;

  /** Identificador URL amigable */
  slug: string;

  /** Descripción del producto */
  description?: string | null;

  /** Precio */
  price: number;

  /** Inventario disponible */
  stock: number;

  /** Imágenes del producto */
  images: string[];

  /** Indica si el producto está publicado */
  isActive: boolean;

  /** Fecha de creación ISO */
  createdAt: string;

  /** Fecha de actualización ISO */
  updatedAt?: string | null;
}

/**
 * ==========================================================
 * PRODUCT SUMMARY
 * ==========================================================
 *
 * Versión ligera para tarjetas, búsquedas y listados.
 */
export interface ProductSummary {
  id: string;
  storeId: string;
  categoryId?: string | null;
  title: string;
  slug: string;
  price: number;
  stock: number;
  images: string[];
  isActive: boolean;
}

/**
 * ==========================================================
 * PRODUCT DETAIL
 * ==========================================================
 *
 * Producto enriquecido con información relacionada.
 *
 * Estas propiedades NO necesariamente existen como columnas
 * en public.products. Son relaciones/resoluciones realizadas
 * por la aplicación.
 */
export interface ProductDetail extends Product {
  store?: Store | null;
  category?: Category | null;
}

/**
 * ==========================================================
 * CATEGORY TREE
 * ==========================================================
 *
 * Alias para representar un árbol completo de categorías.
 */
export type CategoryTree = Category[];
