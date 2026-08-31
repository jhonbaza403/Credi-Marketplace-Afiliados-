// ==========================================================
// ARCHIVO: src/types/short-video.ts
// Credi Marketplace — Modelo de Videos Cortos
//
// Next.js 16.3
// React 19
// TypeScript Strict
// Supabase
// ==========================================================

// ==========================================================
// ENUMS / UNIONS
// ==========================================================

export type ShortVideoStatus =
  | 'draft'
  | 'processing'
  | 'published'
  | 'unpublished'
  | 'blocked';

export type ShortVideoVisibility =
  | 'public'
  | 'private';

export type ShortVideoContentType =
  | 'product'
  | 'service';

// ==========================================================
// ENTIDAD PRINCIPAL
// ==========================================================

export interface ShortVideo {
  /**
   * Identificador único del video.
   */
  readonly id: string;

  /**
   * Usuario propietario del video.
   */
  readonly userId: string;

  /**
   * Título público del video.
   */
  readonly title: string;

  /**
   * URL del archivo de video.
   */
  readonly videoUrl: string;

  /**
   * Imagen de portada / thumbnail.
   */
  readonly thumbnailUrl: string | null;

  /**
   * Duración en segundos.
   *
   * Regla de negocio:
   * máximo 90 segundos.
   */
  readonly durationSeconds: number;

  /**
   * Cantidad total de likes.
   */
  readonly likesCount: number;

  /**
   * Producto asociado.
   *
   * Puede ser null cuando el video promociona
   * un servicio.
   */
  readonly productId: string | null;

  /**
   * Servicio asociado.
   *
   * Puede ser null cuando el video promociona
   * un producto.
   */
  readonly serviceId: string | null;

  /**
   * Tipo de contenido promocionado.
   */
  readonly contentType: ShortVideoContentType;

  /**
   * Estado de publicación.
   */
  readonly status: ShortVideoStatus;

  /**
   * Visibilidad del video.
   */
  readonly visibility: ShortVideoVisibility;

  /**
   * Fecha de creación ISO 8601.
   */
  readonly createdAt: string;

  /**
   * Fecha de última modificación ISO 8601.
   */
  readonly updatedAt: string;
}

// ==========================================================
// VALIDACIÓN DE REGLAS DE NEGOCIO
// ==========================================================

export const SHORT_VIDEO_MAX_DURATION_SECONDS = 90 as const;

export const SHORT_VIDEO_MIN_DURATION_SECONDS = 1 as const;

// ==========================================================
// DTO PARA CREAR UN VIDEO
// ==========================================================

export interface CreateShortVideoInput {
  readonly title: string;
  readonly videoUrl: string;
  readonly thumbnailUrl?: string | null;
  readonly durationSeconds: number;
  readonly productId?: string | null;
  readonly serviceId?: string | null;
}

// ==========================================================
// DTO PARA ACTUALIZAR UN VIDEO
// ==========================================================

export interface UpdateShortVideoInput {
  readonly title?: string;
  readonly thumbnailUrl?: string | null;
  readonly status?: ShortVideoStatus;
  readonly visibility?: ShortVideoVisibility;
}

// ==========================================================
// RESPUESTA PAGINADA
// ==========================================================

export interface ShortVideoPage {
  readonly data: readonly ShortVideo[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

// ==========================================================
// ESTADÍSTICAS
// ==========================================================

export interface ShortVideoStats {
  readonly viewsCount: number;
  readonly likesCount: number;
  readonly commentsCount: number;
  readonly sharesCount: number;
}
