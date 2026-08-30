// ==========================================================
// ARCHIVO: src/features/subscriptions/plans.ts
// Credi Marketplace
//
// Catálogo de planes de suscripción
// Next.js 16.3
// React 19
// TypeScript
//
// IMPORTANTE:
// - Este archivo define el catálogo visible de planes.
// - NO constituye una fuente de autorización.
// - NO debe utilizarse para validar pagos.
// - La validación real de suscripciones debe realizarse
//   en servidor y/o mediante Supabase.
// ==========================================================

/**
 * Periodicidad de facturación.
 */
export type SubscriptionInterval =
  | 'monthly'
  | 'yearly';

/**
 * Identificadores internos de los planes.
 *
 * Mantener estos valores estables es importante porque
 * posteriormente pueden utilizarse como referencias en:
 *
 * - Supabase
 * - proveedores de pago
 * - facturación
 * - promociones
 * - analytics
 * - permisos
 */
export type SubscriptionPlanId =
  | 'free'
  | 'premium-pro';

/**
 * Funcionalidades que puede ofrecer un plan.
 *
 * Estos identificadores son útiles para que la aplicación
 * pueda comprobar capacidades sin depender de textos visibles.
 */
export type SubscriptionFeature =
  | 'publish_products'
  | 'publish_services'
  | 'global_marketplace'
  | 'standard_sales_commission'
  | 'reduced_sales_commission'
  | 'ai_recommendations'
  | 'advanced_analytics'
  | 'priority_support';

/**
 * Definición de un plan de suscripción.
 */
export interface SubscriptionPlan {
  /**
   * Identificador único y estable del plan.
   */
  id: SubscriptionPlanId;

  /**
   * Nombre comercial mostrado al usuario.
   */
  name: string;

  /**
   * Descripción corta del plan.
   */
  description: string;

  /**
   * Precio del plan.
   *
   * IMPORTANTE:
   * El frontend únicamente utiliza este valor para
   * presentación. El precio definitivo debe validarse
   * en servidor antes de procesar un pago.
   */
  price: number;

  /**
   * Moneda de facturación.
   */
  currency: 'USD';

  /**
   * Intervalo de facturación.
   */
  interval: SubscriptionInterval;

  /**
   * Indica si el plan requiere pago.
   */
  isPaid: boolean;

  /**
   * Comisión aplicada a las ventas.
   *
   * Se representa como porcentaje:
   *
   * 5 = 5%
   * 2 = 2%
   */
  salesCommissionPercent: number;

  /**
   * Capacidades internas del plan.
   */
  features: readonly SubscriptionFeature[];

  /**
   * Características traducibles para mostrar
   * directamente en la interfaz.
   */
  featureLabels: readonly string[];

  /**
   * Indica si el plan puede contratarse actualmente.
   */
  isActive: boolean;

  /**
   * Indica si debe destacarse visualmente.
   */
  isPopular?: boolean;
}

/**
 * ==========================================================
 * PLAN GRATUITO
 * ==========================================================
 */
const FREE_PLAN: SubscriptionPlan = {
  id: 'free',

  name: 'Cuenta Gratuita',

  description:
    'Herramientas esenciales para comenzar a vender en Credi Marketplace.',

  price: 0,

  currency: 'USD',

  interval: 'monthly',

  isPaid: false,

  salesCommissionPercent: 5,

  features: [
    'publish_products',
    'publish_services',
    'global_marketplace',
    'standard_sales_commission',
  ],

  featureLabels: [
    'Publicar productos y servicios',
    'Comisión estándar por venta del 5%',
    'Acceso al marketplace global',
  ],

  isActive: true,

  isPopular: false,
};

/**
 * ==========================================================
 * PLAN PREMIUM PRO
 * ==========================================================
 */
const PREMIUM_PRO_PLAN: SubscriptionPlan = {
  id: 'premium-pro',

  name: 'Vendedor Pro',

  description:
    'Mayor visibilidad, herramientas avanzadas y mejores condiciones para vendedores profesionales.',

  price: 19.99,

  currency: 'USD',

  interval: 'monthly',

  isPaid: true,

  salesCommissionPercent: 2,

  features: [
    'publish_products',
    'publish_services',
    'global_marketplace',
    'reduced_sales_commission',
    'ai_recommendations',
    'advanced_analytics',
    'priority_support',
  ],

  featureLabels: [
    'Comisión reducida por venta del 2%',
    'Mayor exposición mediante recomendaciones e IA',
    'Estadísticas y métricas avanzadas',
    'Soporte prioritario',
  ],

  isActive: true,

  isPopular: true,
};

/**
 * ==========================================================
 * CATÁLOGO OFICIAL DE PLANES
 * ==========================================================
 *
 * readonly evita que componentes de la aplicación modifiquen
 * accidentalmente el catálogo durante la ejecución.
 */
export const SUBSCRIPTION_PLANS: readonly SubscriptionPlan[] = [
  FREE_PLAN,
  PREMIUM_PRO_PLAN,
];

/**
 * ==========================================================
 * PLAN POR DEFECTO
 * ==========================================================
 */
export const DEFAULT_SUBSCRIPTION_PLAN_ID: SubscriptionPlanId =
  'free';

/**
 * ==========================================================
 * PLAN GRATUITO
 * ==========================================================
 */
export const FREE_SUBSCRIPTION_PLAN_ID: SubscriptionPlanId =
  'free';

/**
 * ==========================================================
 * OBTENER PLAN POR ID
 * ==========================================================
 */
export function getSubscriptionPlan(
  planId: string | null | undefined,
): SubscriptionPlan | undefined {
  if (!planId) {
    return undefined;
  }

  return SUBSCRIPTION_PLANS.find(
    (plan) => plan.id === planId,
  );
}

/**
 * ==========================================================
 * COMPROBAR SI UN PLAN ESTÁ ACTIVO
 * ==========================================================
 */
export function isSubscriptionPlanActive(
  planId: string | null | undefined,
): boolean {
  const plan = getSubscriptionPlan(planId);

  return Boolean(plan?.isActive);
}

/**
 * ==========================================================
 * COMPROBAR CAPACIDAD DE UN PLAN
 * ==========================================================
 *
 * NOTA:
 * Esta función sirve para la lógica de interfaz.
 *
 * NO debe utilizarse como mecanismo definitivo de seguridad.
 * La autorización real debe verificarse en servidor.
 */
export function planHasFeature(
  planId: string | null | undefined,
  feature: SubscriptionFeature,
): boolean {
  const plan = getSubscriptionPlan(planId);

  if (!plan || !plan.isActive) {
    return false;
  }

  return plan.features.includes(feature);
}

/**
 * ==========================================================
 * OBTENER COMISIÓN DEL PLAN
 * ==========================================================
 */
export function getSalesCommissionPercent(
  planId: string | null | undefined,
): number {
  const plan = getSubscriptionPlan(planId);

  if (!plan || !plan.isActive) {
    return FREE_SUBSCRIPTION_PLAN.salesCommissionPercent;
  }

  return plan.salesCommissionPercent;
}

/**
 * ==========================================================
 * REFERENCIA DIRECTA AL PLAN GRATUITO
 * ==========================================================
 */
export const FREE_SUBSCRIPTION_PLAN = FREE_PLAN;

/**
 * ==========================================================
 * REFERENCIA DIRECTA AL PLAN PREMIUM
 * ==========================================================
 */
export const PREMIUM_PRO_SUBSCRIPTION_PLAN =
  PREMIUM_PRO_PLAN;
