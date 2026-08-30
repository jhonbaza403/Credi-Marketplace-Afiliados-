import type { Product } from '@/types/product'

type Preferences = {
  region?: string | null
  interests?: readonly string[]
}

type RecommendationProduct = Product & { region?: string | null; rating?: number | null }

export function recommendProducts(
  products: readonly RecommendationProduct[],
  preferences: Preferences,
): RecommendationProduct[] {
  const interests = new Set((preferences.interests ?? []).map((item) => item.toLowerCase()))
  const region = preferences.region?.toLowerCase() ?? null

  return [...products].sort((a, b) => {
    const score = (product: RecommendationProduct) => {
      let value = product.is_active ? 10 : 0
      if (product.stock > 0) value += 5
      if (product.rating) value += Math.min(product.rating, 5) * 2
      if (region && product.region?.toLowerCase() === region) value += 4
      const category = product.category?.toLowerCase() ?? ''
      if (category && interests.has(category)) value += 6
      return value
    }
    return score(b) - score(a)
  })
}
