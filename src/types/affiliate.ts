// ==========================================================
// ARCHIVO: src/types/affiliate.ts
// Credi Marketplace
//
// Tipos del dominio de afiliados
//
// Next.js 16.3
// React 19
// TypeScript
// ==========================================================

/**
 * Idiomas soportados por el módulo de afiliados.
 */
export type SupportedLocale =
  | "es"
  | "en"
  | "pt"
  | "fr";

/**
 * Texto localizado.
 */
export interface LocalizedText {
  es: string;
  en: string;
  pt: string;
  fr: string;
}

/**
 * Variante visual del badge.
 */
export type AffiliateBadgeVariant =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

/**
 * Socio comercial.
 */
export interface AffiliatePartner {
  id: string;
  name: string;
}

/**
 * Configuración de tracking.
 */
export interface AffiliateTracking {
  enabled: boolean;
  campaign?: string;
  source?: string;
}

/**
 * Disponibilidad del producto afiliado.
 */
export interface AffiliateAvailability {
  active: boolean;
  countries?: string[];
}

/**
 * Producto afiliado.
 *
 * Se mantienen `affiliateUrl` y `url` para compatibilidad
 * con diferentes consumidores existentes del proyecto.
 */
export interface AffiliateProduct {
  id: string;

  /**
   * Nombre interno/comercial del producto.
   */
  name: string;

  /**
   * Socio o partner que ofrece el producto.
   */
  partner: AffiliatePartner;

  /**
   * Categoría localizada.
   */
  category: LocalizedText;

  /**
   * Título localizado.
   */
  title: LocalizedText;

  /**
   * Descripción localizada.
   */
  description: LocalizedText;

  /**
   * URL principal del programa/producto afiliado.
   */
  affiliateUrl: string;

  /**
   * Alias compatible con componentes existentes.
   */
  url?: string;

  /**
   * Texto localizado del botón.
   */
  buttonText: LocalizedText;

  /**
   * Icono visual.
   */
  icon: string;

  /**
   * Texto del badge.
   */
  badge: string;

  /**
   * Clase CSS opcional del badge.
   */
  badgeColor?: string;

  /**
   * Variante semántica del badge.
   */
  badgeVariant: AffiliateBadgeVariant;

  /**
   * Configuración de tracking.
   */
  tracking: AffiliateTracking;

  /**
   * Disponibilidad comercial.
   */
  availability: AffiliateAvailability;
}
