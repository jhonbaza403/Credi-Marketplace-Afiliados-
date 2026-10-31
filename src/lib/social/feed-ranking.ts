export const FEED_INTERESTS = [
  { id: 'technology', label: 'Tecnología', keywords: ['tecnologia', 'software', 'programacion', 'digital', 'internet', 'computacion'] },
  { id: 'business', label: 'Emprendimiento y negocios', keywords: ['emprendimiento', 'empresa', 'empresarial', 'startup', 'negocio', 'marketing'] },
  { id: 'commerce', label: 'Comercio y ofertas', keywords: ['comercio', 'tienda', 'producto', 'oferta', 'ventas', 'compras'] },
  { id: 'fashion', label: 'Moda y diseño', keywords: ['moda', 'ropa', 'vestuario', 'calzado', 'diseno', 'coleccion'] },
  { id: 'food', label: 'Gastronomía', keywords: ['gastronomia', 'comida', 'restaurante', 'receta', 'cocina', 'alimentos'] },
  { id: 'education', label: 'Educación', keywords: ['educacion', 'curso', 'aprender', 'estudio', 'formacion', 'academia'] },
  { id: 'sports', label: 'Deportes', keywords: ['deporte', 'futbol', 'baloncesto', 'entrenamiento', 'competencia', 'atletismo'] },
  { id: 'culture', label: 'Música y cultura', keywords: ['musica', 'arte', 'cultura', 'festival', 'libro', 'lectura'] },
  { id: 'travel', label: 'Viajes y turismo', keywords: ['viaje', 'turismo', 'destino', 'hotel', 'aventura', 'hospedaje'] },
  { id: 'home', label: 'Hogar y estilo de vida', keywords: ['hogar', 'casa', 'decoracion', 'jardin', 'muebles', 'interiores'] },
] as const

export type FeedInterestId = typeof FEED_INTERESTS[number]['id']
export type FeedRankingMode = 'chronological' | 'interests'
export interface FeedRankingPreferences { interests: readonly string[]; mode: FeedRankingMode }
export interface FeedRankableItem { title?: string | null; body?: string | null; created_at?: string | null }
export interface RankedFeedItem<T> { item: T; matchedInterests: string[] }

const interestLookup = new Map(FEED_INTERESTS.map((interest) => [interest.id, interest]))

export function isFeedInterestId(value: string): value is FeedInterestId {
  return interestLookup.has(value)
}

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase()
}

function tokenize(value: string): Set<string> {
  return new Set(normalizeText(value).match(/[\p{L}\p{N}]+/gu) ?? [])
}

export function rankFeedItemsForUser<T extends FeedRankableItem>(
  items: readonly T[],
  preferences: FeedRankingPreferences = { interests: [], mode: 'chronological' },
): RankedFeedItem<T>[] {
  const selected = [...new Set(preferences.interests)]
    .filter((interest): interest is FeedInterestId => isFeedInterestId(interest))
    .map((interest) => interestLookup.get(interest)!)
  const ranked = items.map((item, originalIndex) => {
    const tokens = tokenize([item.title ?? '', item.body ?? ''].join(' '))
    const matchedInterests = selected
      .filter((interest) => interest.keywords.some((keyword) => tokens.has(keyword)))
      .map((interest) => interest.label)
    return { item, matchedInterests, originalIndex }
  })

  ranked.sort((left, right) => {
    if (preferences.mode === 'interests' && selected.length > 0 &&
        right.matchedInterests.length !== left.matchedInterests.length) {
      return right.matchedInterests.length - left.matchedInterests.length
    }
    const leftDate = Date.parse(left.item.created_at ?? '')
    const rightDate = Date.parse(right.item.created_at ?? '')
    if (Number.isFinite(leftDate) && Number.isFinite(rightDate) && leftDate !== rightDate) {
      return rightDate - leftDate
    }
    return left.originalIndex - right.originalIndex
  })

  return ranked.map(({ item, matchedInterests }) => ({ item, matchedInterests }))
}
