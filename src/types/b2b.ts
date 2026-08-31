// ==========================================================
// ARCHIVO: src/types/b2b.ts
// Tipos de datos para el módulo B2B
// Credi Marketplace
// ==========================================================

/**
 * Estados disponibles para productos B2B.
 *
 * Debe mantenerse sincronizado con:
 * public.b2b_product_status
 */
export type B2BProductStatus =
  | 'draft'
  | 'active'
  | 'inactive';

/**
 * Estados disponibles para órdenes B2B.
 *
 * Debe mantenerse sincronizado con:
 * public.b2b_order_status
 */
export type B2BOrderStatus =
  | 'pending'
  | 'verifying'
  | 'completed'
  | 'cancelled';

/**
 * Métodos de pago B2B.
 *
 * Debe mantenerse sincronizado con:
 * public.b2b_payment_method
 */
export type B2BPaymentMethod =
  | 'binance_pay'
  | 'usdt_trc20'
  | 'bank_transfer';

/**
 * Producto publicado en el marketplace B2B.
 */
export interface B2BProduct {
  /** UUID del producto */
  id: string;

  /** UUID del proveedor */
  supplierId: string;

  /** UUID de la categoría, si existe */
  categoryId?: string | null;

  /** Nombre del producto */
  title: string;

  /** Identificador URL amigable */
  slug: string;

  /** Descripción comercial */
  description?: string | null;

  /** Código SKU opcional */
  sku?: string | null;

  /**
   * Precio regular expresado en USD.
   *
   * Puede utilizarse como referencia comercial.
   */
  regularPriceUsd?: number | null;

  /**
   * Precio unitario B2B.
   *
   * Debe coincidir con el campo correspondiente
   * definido en la base de datos.
   */
  unitPriceUsdt: number;

  /**
   * Cantidad mínima de compra.
   */
  moq: number;

  /**
   * Inventario disponible.
   */
  stockAvailable: number;

  /** Imagen principal */
  imageUrl?: string | null;

  /** Estado del producto */
  status: B2BProductStatus;

  /** Fecha de creación */
  createdAt: string;

  /** Fecha de última actualización */
  updatedAt: string;
}

/**
 * Orden mayorista B2B.
 *
 * Esta interfaz está alineada con la tabla:
 *
 * public.b2b_orders
 */
export interface B2BOrder {
  /** UUID de la orden */
  id: string;

  /** UUID del comprador */
  userId: string;

  /** UUID del producto B2B */
  productId: string;

  /**
   * UUID del proveedor.
   *
   * Puede ser null porque la base de datos
   * permite supplier_id NULL.
   */
  supplierId?: string | null;

  /**
   * Nombre del producto almacenado como snapshot
   * histórico de la orden.
   */
  productTitle: string;

  /** Cantidad solicitada */
  quantity: number;

  /** Precio unitario en USD */
  unitPriceUsd: number;

  /**
   * Total de la orden.
   *
   * Debe cumplir:
   *
   * totalUsd = quantity × unitPriceUsd
   */
  totalUsd: number;

  /** Método de pago utilizado */
  paymentMethod: B2BPaymentMethod;

  /**
   * Identificador de transacción de Binance Pay.
   *
   * Puede ser null cuando todavía no existe.
   */
  binanceTxId?: string | null;

  /** Estado de la orden */
  status: B2BOrderStatus;

  /** Fecha de creación */
  createdAt: string;

  /** Fecha de última actualización */
  updatedAt: string;
}

/**
 * Calificación realizada entre usuarios.
 *
 * Corresponde a:
 * public.ratings
 */
export interface Rating {
  /** UUID de la calificación */
  id: string;

  /** UUID del usuario que califica */
  reviewerId: string;

  /** UUID del usuario calificado */
  targetUserId: string;

  /** Calificación de 1 a 5 */
  rating: number;

  /** Comentario */
  comment?: string | null;

  /** Indica si la valoración incluye denuncia de estafa */
  isScamReport: boolean;

  /** Fecha de creación */
  createdAt: string;
}

/**
 * Resumen de producto B2B.
 *
 * Utilizado en tarjetas, búsquedas y listados.
 */
export interface B2BProductSummary {
  id: string;
  supplierId: string;
  categoryId?: string | null;
  title: string;
  slug: string;
  unitPriceUsdt: number;
  moq: number;
  stockAvailable: number;
  imageUrl?: string | null;
  status: B2BProductStatus;
}

/**
 * Resumen de una orden B2B.
 *
 * Útil para dashboards de compradores y proveedores.
 */
export interface B2BOrderSummary {
  id: string;
  productId: string;
  productTitle: string;
  quantity: number;
  unitPriceUsd: number;
  totalUsd: number;
  paymentMethod: B2BPaymentMethod;
  status: B2BOrderStatus;
  createdAt: string;
}

/**
 * Producto B2B junto con información resumida
 * del proveedor.
 */
export interface B2BProductWithSupplier extends B2BProduct {
  supplierName?: string | null;
  supplierAvatarUrl?: string | null;
}

/**
 * Orden B2B junto con información resumida
 * del producto y proveedor.
 */
export interface B2BOrderWithDetails extends B2BOrder {
  supplierName?: string | null;
  productImageUrl?: string | null;
}
