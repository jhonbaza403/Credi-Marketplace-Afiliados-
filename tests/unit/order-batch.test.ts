import { describe, expect, it } from 'vitest'
import {
  normalizeOrderBatchItems,
  resolveOrderIdempotencyKey,
} from '@/lib/orders/order-batch'

const productA = 'a3d6a9c0-8e8e-4f1e-8a1b-4b3d9b4d2001'
const productB = 'b3d6a9c0-8e8e-4f1e-8a1b-4b3d9b4d2002'

describe('canonical commerce order batch', () => {
  it('normalizes items to the database contract and combines duplicate SKUs', () => {
    expect(normalizeOrderBatchItems([
      { productId: productB, quantity: 1 },
      { productId: productA, quantity: 2 },
      { productId: productA.toUpperCase(), quantity: 3 },
    ])).toEqual([
      { product_id: productA, quantity: 5 },
      { product_id: productB, quantity: 1 },
    ])
  })

  it('rejects empty, malformed and excessive quantities', () => {
    expect(() => normalizeOrderBatchItems([])).toThrow('INVALID_ORDER_ITEMS')
    expect(() => normalizeOrderBatchItems([{ productId: 'not-a-uuid', quantity: 1 }])).toThrow('INVALID_PRODUCT_ID')
    expect(() => normalizeOrderBatchItems([{ productId: productA, quantity: 101 }])).toThrow('INVALID_QUANTITY')
  })

  it('rejects a duplicate SKU total above the reservation limit', () => {
    expect(() => normalizeOrderBatchItems([
      { productId: productA, quantity: 75 },
      { productId: productA, quantity: 30 },
    ])).toThrow('QUANTITY_LIMIT_EXCEEDED')
  })

  it('uses a stable supplied idempotency key and rejects unsafe values', () => {
    expect(resolveOrderIdempotencyKey('order:request_202611261234')).toBe('order:request_202611261234')
    expect(() => resolveOrderIdempotencyKey('bad')).toThrow('INVALID_IDEMPOTENCY_KEY')
  })
})
