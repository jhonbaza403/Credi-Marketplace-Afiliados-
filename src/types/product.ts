export interface Store {
  id: string;
  vendorId: string;
  storeName: string;
  slug: string;
  description?: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  children?: Category[];
  createdAt?: string;
  updatedAt?: string | null;
}

export interface Product {
  id: string;
  storeId: string;
  categoryId?: string | null;
  title: string;
  slug: string;
  description?: string | null;
  price: number;
  stock: number;
  images: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;

  /** Raw Supabase/PostgreSQL aliases supported at the data boundary. */
  store_id?: string;
  category_id?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string | null;
}

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

export interface ProductDetail extends Product {
  store?: Store | null;
  category?: Category | null;
}

export type CategoryTree = Category[];
