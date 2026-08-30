// ==========================================================
// ARCHIVO: src/features/recommendation/index.ts
// Credi Marketplace
//
// Motor de recomendación de productos
// Next.js 16.3
// React 19
// TypeScript
//
// Arquitectura:
// - Ranking determinístico
// - Personalización por región
// - Personalización por intereses
// - Valoración del producto
// - Disponibilidad
// - Estado del producto
// - Desempate estable
//
// IMPORTANTE:
// Este módulo realiza ranking para la experiencia de usuario.
// NO constituye un mecanismo de autorización, seguridad,
// filtrado de acceso ni decisión comercial definitiva.
// ==========================================================

import type { Product } from '@/types/product';

// ==========================================================
// TIPOS
// ==========================================================

/**
 * Preferencias utilizadas por el motor de recomendación.
 *
 * Todas las propiedades son opcionales para permitir que el
 * algoritmo funcione incluso con perfiles incompletos.
 */
export interface UserPreferences {
  /**
   * Región o mercado preferido.
   *
   * Ejemplo:
   * - VE
   * - US
   * - CO
   * - global
   */
  region?: string | null;

  /**
   * Idioma preferido del usuario.
   *
   * Actualmente se conserva como contexto para futuras
   * versiones del motor de recomendación.
   */
  language?: string | null;

  /**
   * Slugs de categorías de interés.
   */
  interests?: readonly string[];
}

/**
 * Producto enriquecido para recomendaciones.
 *
 * Estos campos NO forman parte obligatoriamente del modelo
 * persistente de Product.
 *
 * Permiten que el algoritmo trabaje con información adicional
 * cuando una consulta específica la proporciona.
 */
export interface RecommendationProduct extends Product {
  /**
   * Región o mercado objetivo del producto.
   *
   * Si no existe, se considera global para efectos del ranking.
   */
  region?: string | null;

  /**
   * Valoración promedio.
   */
  rating?: number | null;

  /**
   * Cantidad de reseñas.
   */
  reviewCount?: number | null;
}

/**
 * Resultado interno del algoritmo.
 */
interface ScoredProduct {
  product: RecommendationProduct;
  score: number;
  originalIndex: number;
}

// ==========================================================
// CONFIGURACIÓN DEL ALGORITMO
// ==========================================================

const RECOMMENDATION_WEIGHTS = {
  regionMatch: 10,
  globalRegion: 8,
  interestMatch: 15,
  rating: 2,
  reviewCount: 0.1,
  activeProduct: 5,
  availableStock: 3,
} as const;

// ==========================================================
// FUNCIONES AUXILIARES
// ==========================================================

/**
 * Normaliza un texto para realizar comparaciones consistentes.
 */
function normalize(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

/**
 * Normaliza un número para impedir que valores inválidos
 * contaminen la puntuación.
 */
function normalizeNumber(
  value: number | null | undefined,
  fallback = 0,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return value;
}

/**
 * Comprueba si una categoría pertenece a los intereses
 * declarados por el usuario.
 */
function hasInterestMatch(
  product: RecommendationProduct,
  interests: readonly string[],
): boolean {
  if (!product.category_id || interests.length === 0) {
    return false;
  }

  const normalizedInterests = interests.map(normalize);

  return normalizedInterests.includes(
    normalize(product.category_id),
  );
}

/**
 * Calcula la puntuación regional.
 */
function calculateRegionScore(
  product: RecommendationProduct,
  preferredRegion: string | null | undefined,
): number {
  const region = normalize(product.region);
  const preference = normalize(preferredRegion);

  if (!region) {
    return 0;
  }

  if (region === 'global') {
    return RECOMMENDATION_WEIGHTS.globalRegion;
  }

  if (preference && region === preference) {
    return RECOMMENDATION_WEIGHTS.regionMatch;
  }

  return 0;
}

/**
 * Calcula la puntuación de valoración.
 *
 * La valoración se limita conceptualmente a 0–5.
 */
function calculateRatingScore(
  rating: number | null | undefined,
): number {
  const normalizedRating = Math.min(
    5,
    Math.max(0, normalizeNumber(rating)),
  );

  return (
    normalizedRating *
    RECOMMENDATION_WEIGHTS.rating
  );
}

/**
 * Calcula una pequeña señal de confianza basada en
 * cantidad de reseñas.
 *
 * Se utiliza deliberadamente como factor secundario para
 * evitar que una sola reseña de 5 estrellas domine el ranking.
 */
function calculateReviewScore(
  reviewCount: number | null | undefined,
): number {
  const reviews = Math.max(
    0,
    normalizeNumber(reviewCount),
  );

  /**
   * Límite para impedir que una cantidad enorme de reseñas
   * domine completamente el ranking.
   */
  const cappedReviews = Math.min(reviews, 100);

  return (
    cappedReviews *
    RECOMMENDATION_WEIGHTS.reviewCount
  );
}

/**
 * Calcula la puntuación de disponibilidad.
 */
function calculateAvailabilityScore(
  product: RecommendationProduct,
): number {
  if (product.stock > 0) {
    return RECOMMENDATION_WEIGHTS.availableStock;
  }

  return 0;
}

/**
 * Calcula la puntuación total de un producto.
 */
function calculateProductScore(
  product: RecommendationProduct,
  preferences: UserPreferences,
): number {
  let score = 0;

  // --------------------------------------------------------
  // Región
  // --------------------------------------------------------

  score += calculateRegionScore(
    product,
    preferences.region,
  );

  // --------------------------------------------------------
  // Intereses
  // --------------------------------------------------------

  if (
    hasInterestMatch(
      product,
      preferences.interests ?? [],
    )
  ) {
    score +=
      RECOMMENDATION_WEIGHTS.interestMatch;
  }

  // --------------------------------------------------------
  // Valoración
  // --------------------------------------------------------

  score += calculateRatingScore(
    product.rating,
  );

  // --------------------------------------------------------
  // Cantidad de reseñas
  // --------------------------------------------------------

  score += calculateReviewScore(
    product.reviewCount,
  );

  // --------------------------------------------------------
  // Estado
  // --------------------------------------------------------

  if (product.is_active) {
    score +=
      RECOMMENDATION_WEIGHTS.activeProduct;
  }

  // --------------------------------------------------------
  // Disponibilidad
  // --------------------------------------------------------

  score += calculateAvailabilityScore(product);

  return score;
}

// ==========================================================
// RANKING PRINCIPAL
// ==========================================================

/**
 * Ordena productos de acuerdo con las preferencias del usuario.
 *
 * Características:
 *
 * 1. No modifica el array original.
 * 2. Mantiene estabilidad en caso de empate.
 * 3. Tolera perfiles incompletos.
 * 4. Tolera productos con datos incompletos.
 * 5. Prioriza región e intereses.
 * 6. Considera valoración y confianza.
 * 7. Prioriza productos activos y disponibles.
 */
export function rankProductsForUser(
  products: readonly RecommendationProduct[],
  preferences: UserPreferences = {},
): RecommendationProduct[] {
  return products
    .map(
      (
        product,
        originalIndex,
      ): ScoredProduct => ({
        product,
        score: calculateProductScore(
          product,
          preferences,
        ),
        originalIndex,
      }),
    )
    .sort((a, b) => {
      // Mayor puntuación primero.
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      // Desempate por valoración.
      const ratingA = normalizeNumber(
        a.product.rating,
      );

      const ratingB = normalizeNumber(
        b.product.rating,
      );

      if (ratingB !== ratingA) {
        return ratingB - ratingA;
      }

      // Desempate por fecha de creación.
      const dateA = Date.parse(
        a.product.created_at,
      );

      const dateB = Date.parse(
        b.product.created_at,
      );

      if (
        Number.isFinite(dateA) &&
        Number.isFinite(dateB) &&
        dateB !== dateA
      ) {
        return dateB - dateA;
      }

      // Desempate final estable.
      return (
        a.originalIndex -
        b.originalIndex
      );
    })
    .map(({ product }) => product);
}

// ==========================================================
// RANKING CON PUNTUACIONES
// ==========================================================

/**
 * Variante útil para administración, analytics y debugging.
 *
 * Devuelve el producto acompañado de su puntuación.
 */
export function rankProductsWithScores(
  products: readonly RecommendationProduct[],
  preferences: UserPreferences = {},
): Array<{
  product: RecommendationProduct;
  score: number;
}> {
  return products
    .map((product, originalIndex) => ({
      product,
      score: calculateProductScore(
        product,
        preferences,
      ),
      originalIndex,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return (
        a.originalIndex -
        b.originalIndex
      );
    })
    .map(({ product, score }) => ({
      product,
      score,
    }));
}

// ==========================================================
// TOP RECOMMENDATIONS
// ==========================================================

/**
 * Devuelve solamente las mejores recomendaciones.
 */
export function getTopRecommendedProducts(
  products: readonly RecommendationProduct[],
  preferences: UserPreferences = {},
  limit = 10,
): RecommendationProduct[] {
  if (!Number.isInteger(limit) || limit <= 0) {
    return [];
  }

  return rankProductsForUser(
    products,
    preferences,
  ).slice(0, limit);
}
