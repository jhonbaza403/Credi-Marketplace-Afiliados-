import type {
  StoreProfile,
  StoreSummary,
} from "./user";

export interface Seller {
  id: string;
  userId: string;
  store: StoreProfile | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SellerSummary {
  id: string;
  userId: string;
  store: StoreSummary | null;
  isVerified: boolean;
}

export interface SellerStats {
  productsCount: number;
  ordersCount: number;
  salesAmount: number;
  pendingOrders: number;
  completedOrders: number;
}

export interface SellerDashboard {
  seller: Seller;
  stats: SellerStats;
}
