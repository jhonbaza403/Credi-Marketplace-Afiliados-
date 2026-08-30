// ==========================================================
// ARCHIVO: src/types/order.ts
// Tipos de órdenes y elementos de órdenes
// Credi Marketplace
// ==========================================================

/**
 * ==========================================================
 * ORDER STATUS
 * ==========================================================
 *
 * Debe mantenerse sincronizado con:
 *
 * public.order_status
 *
 * en Supabase / PostgreSQL.
 */
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'completed';

/**
 * ==========================================================
 * SHIPPING ADDRESS
 * ==========================================================
 *
 * Dirección de envío.
 *
 * No debe utilizarse `Record<string, any>`, porque `any`
 * elimina prácticamente toda la seguridad de TypeScript.
 */
export interface ShippingAddress {
  fullName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
  reference?: string | null;
}

/**
 * ==========================================================
 * ORDER ITEM
 * ==========================================================
 *
 * Representa un elemento de public.order_items.
 */
export interface OrderItem {
  /** UUID del elemento */
  id: string;

  /** UUID de la orden */
  orderId: string;

  /** UUID del producto */
  productId?: string | null;

  /** UUID de la tienda */
  storeId?: string | null;

  /**
   * Título almacenado como snapshot.
   *
   * Es importante conservarlo aunque el producto
   * posteriormente cambie de nombre.
   */
  productTitle: string;

  /** Cantidad comprada */
  quantity: number;

  /**
   * Precio unitario registrado en el momento
   * de la compra.
   */
  unitPrice: number;

  /** Fecha de creación ISO */
  createdAt: string;
}

/**
 * ==========================================================
 * ORDER
 * ==========================================================
 *
 * Representa public.orders.
 */
export interface Order {
  /** UUID de la orden */
  id: string;

  /** UUID del comprador */
  buyerId: string;

  /** Importe total de la orden */
  totalAmount: number;

  /** Estado actual de la orden */
  status: OrderStatus;

  /**
   * Dirección de envío.
   *
   * Puede ser null cuando la orden no requiere
   * envío físico.
   */
  shippingAddress?: ShippingAddress | null;

  /** Referencia de afiliado, si existe */
  affiliateRef?: string | null;

  /** Fecha de creación ISO */
  createdAt: string;

  /** Fecha de actualización ISO */
  updatedAt?: string | null;

  /** Elementos de la orden */
  orderItems?: OrderItem[];
}

/**
 * ==========================================================
 * ORDER SUMMARY
 * ==========================================================
 *
 * Versión ligera para listados y dashboards.
 */
export interface OrderSummary {
  id: string;
  buyerId: string;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
}

/**
 * ==========================================================
 * ORDER DETAIL
 * ==========================================================
 *
 * Orden completa con sus elementos.
 */
export interface OrderDetail extends Order {
  orderItems: OrderItem[];
}

/**
 * ==========================================================
 * CREATE ORDER INPUT
 * ==========================================================
 *
 * Datos necesarios para solicitar la creación
 * de una orden.
 *
 * El buyerId NO debería recibirse desde el cliente.
 * Debe obtenerse mediante auth.uid() en servidor/RPC.
 */
export interface CreateOrderInput {
  orderItems: CreateOrderItemInput[];
  shippingAddress?: ShippingAddress | null;
  affiliateRef?: string | null;
}

/**
 * ==========================================================
 * CREATE ORDER ITEM INPUT
 * ==========================================================
 */
export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
}

/**
 * ==========================================================
 * ORDER RESULT
 * ==========================================================
 *
 * Respuesta normalizada de creación/operación
 * de una orden.
 */
export interface OrderResult {
  success: boolean;

  order?: OrderDetail;

  error?: string;

  errorCode?: string;
}
