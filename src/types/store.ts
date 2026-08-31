/**
 * Tipos de tiendas y vendedores.
 */

export interface Store {
  id: string
  vendorId: string
  storeName: string
  slug: string
  description: string | null
  logoUrl: string | null
  bannerUrl: string | null
  isVerified: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface StoreSummary {
  id: string
  vendorId: string
  storeName: string
  slug: string
  logoUrl: string | null
  isVerified: boolean
}

export interface StoreInsert {
  vendorId: string
  storeName: string
  slug: string
  description?: string | null
  logoUrl?: string | null
  bannerUrl?: string | null
  isVerified?: boolean
  isActive?: boolean
}

export interface StoreUpdate {
  storeName?: string
  slug?: string
  description?: string | null
  logoUrl?: string | null
  bannerUrl?: string | null
  isVerified?: boolean
  isActive?: boolean
}

export interface StoreContact {
  storeId: string
  email?: string | null
  phone?: string | null
  website?: string | null
}

export interface StoreAddress {
  storeId: string
  addressLine1: string
  addressLine2?: string | null
  city: string
  state?: string | null
  postalCode?: string | null
  country: string
}
