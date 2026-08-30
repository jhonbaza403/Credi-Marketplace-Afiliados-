import {
  isUUID,
  isPositiveInteger,
} from '@/lib/validation/common'

export interface ServerOrderItem {
  productId: string
  quantity: number
}

export function validateServerOrder(
  items: ServerOrderItem[],
): void {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    throw new Error('INVALID_ORDER_ITEMS')
  }

  const productIds = new Set<string>()

  for (const item of items) {
    if (!isUUID(item.productId)) {
      throw new Error('INVALID_PRODUCT_ID')
    }

    if (
      !isPositiveInteger(
        item.quantity,
        100,
      )
    ) {
      throw new Error('INVALID_QUANTITY')
    }

    if (productIds.has(item.productId)) {
      throw new Error(
        'DUPLICATE_PRODUCT',
      )
    }

    productIds.add(item.productId)
  }
}
