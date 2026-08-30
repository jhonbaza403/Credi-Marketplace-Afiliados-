// ==========================================================
// ARCHIVO: src/types/service.ts
// Tipos de servicios profesionales
// Credi Marketplace
// ==========================================================

/**
 * Unidades de contratación disponibles para un servicio.
 *
 * Debe mantenerse sincronizado con la lógica de negocio
 * del marketplace.
 */
export type ServiceUnitType =
  | 'hour'
  | 'project'
  | 'session';

/**
 * Monedas soportadas inicialmente.
 *
 * Puede ampliarse posteriormente mediante una tabla
 * de monedas en Supabase.
 */
export type ServiceCurrency =
  | 'USD'
  | 'EUR'
  | 'VES'
  | 'USDT';

/**
 * Estado de publicación del servicio.
 */
export type ServiceStatus =
  | 'draft'
  | 'active'
  | 'inactive'
  | 'archived';

/**
 * Servicio profesional publicado en Credi Marketplace.
 */
export interface Service {
  /** UUID del servicio */
  id: string;

  /** UUID del usuario que presta el servicio */
  providerId: string;

  /** UUID de la categoría */
  categoryId: string | null;

  /** Título comercial del servicio */
  title: string;

  /** Descripción completa */
  description: string;

  /** Precio por unidad de contratación */
  pricePerUnit: number;

  /** Tipo de unidad facturable */
  unitType: ServiceUnitType;

  /** Moneda del precio */
  currency: ServiceCurrency;

  /** Valoración promedio */
  rating: number;

  /** Número total de reseñas */
  reviewCount: number;

  /** Región o zona de prestación */
  region: string | null;

  /** Estado de publicación */
  status: ServiceStatus;

  /** Fecha de creación */
  createdAt: string;

  /** Fecha de última actualización */
  updatedAt: string;
}

/**
 * Versión resumida del servicio.
 *
 * Utilizada para:
 * - tarjetas
 * - búsquedas
 * - resultados
 * - recomendaciones
 */
export interface ServiceSummary {
  id: string;
  providerId: string;
  categoryId: string | null;
  title: string;
  pricePerUnit: number;
  unitType: ServiceUnitType;
  currency: ServiceCurrency;
  rating: number;
  reviewCount: number;
  region: string | null;
}

/**
 * Datos necesarios para publicar un servicio.
 */
export interface CreateServiceInput {
  categoryId?: string | null;
  title: string;
  description: string;
  pricePerUnit: number;
  unitType: ServiceUnitType;
  currency: ServiceCurrency;
  region?: string | null;
}

/**
 * Datos modificables de un servicio.
 */
export interface UpdateServiceInput {
  categoryId?: string | null;
  title?: string;
  description?: string;
  pricePerUnit?: number;
  unitType?: ServiceUnitType;
  currency?: ServiceCurrency;
  region?: string | null;
  status?: ServiceStatus;
}

/**
 * Servicio acompañado de información básica
 * del profesional que lo ofrece.
 */
export interface ServiceWithProvider extends Service {
  provider: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    role: 'professional' | 'company' | 'vendor';
  };
}

/**
 * Servicio acompañado de información de categoría.
 */
export interface ServiceWithCategory extends Service {
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
}
