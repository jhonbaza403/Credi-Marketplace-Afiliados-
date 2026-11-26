export interface OrderBatchInputItem {
  productId: string
  quantity: number
}

export interface CanonicalOrderBatchItem {
  product_id: string
  quantity: number
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]+$/

export function normalizeOrderBatchItems(
  items: readonly OrderBatchInputItem[],
): CanonicalOrderBatchItem[] {
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    throw new Error('INVALID_ORDER_ITEMS')
  }

  const quantities = new Map<string, number>()

  for (const item of items) {
    if (!item || typeof item.productId !== 'string' || !UUID_PATTERN.test(item.productId.trim())) {
      throw new Error('INVALID_PRODUCT_ID')
    }
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) {
      throw new Error('INVALID_QUANTITY')
    }

    const productId = item.productId.trim().toLowerCase()
    const nextQuantity = (quantities.get(productId) ?? 0) + item.quantity
    if (nextQuantity > 100) throw new Error('QUANTITY_LIMIT_EXCEEDED')
    quantities.set(productId, nextQuantity)
  }

  return Array.from(quantities.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([product_id, quantity]) => ({ product_id, quantity }))
}

export function resolveOrderIdempotencyKey(value?: string | null): string {
  if (value == null || value.trim() === '') return crypto.randomUUID()

  const candidate = value.trim()
  if (candidate.length < 16 || candidate.length > 255 || !IDEMPOTENCY_PATTERN.test(candidate)) {
    throw new Error('INVALID_IDEMPOTENCY_KEY')
  }

  return candidate
}
