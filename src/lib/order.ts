import {
  isNonEmptyString,
  isPositiveInteger,
  isUUID,
} from './common'

export const MAX_ORDER_ITEMS = 100
export const MAX_ORDER_QUANTITY = 100

export interface OrderItemInput {
  product_id: string
  quantity: number
}

export interface ValidatedOrderItem {
  productId: string
  quantity: number
}

export function validateOrderItems(
  value: unknown,
):
  | {
      success: true
      items: ValidatedOrderItem[]
    }
  | {
      success: false
      error: string
    } {
  if (!Array.isArray(value)) {
    return {
      success: false,
      error: 'Los productos de la orden deben ser una lista.',
    }
  }

  if (
    value.length === 0 ||
    value.length > MAX_ORDER_ITEMS
  ) {
    return {
      success: false,
      error: `La orden debe contener entre 1 y ${MAX_ORDER_ITEMS} productos.`,
    }
  }

  const items: ValidatedOrderItem[] = []

  for (const item of value) {
    if (!item || typeof item !== 'object') {
      return {
        success: false,
        error: 'Uno de los productos de la orden es inválido.',
      }
    }

    const data = item as Record<string, unknown>

    if (!isUUID(data.product_id)) {
      return {
        success: false,
        error: 'Existe un producto con identificador inválido.',
      }
    }

    if (
      !isPositiveInteger(
        data.quantity,
        MAX_ORDER_QUANTITY,
      )
    ) {
      return {
        success: false,
        error: 'Existe una cantidad inválida en la orden.',
      }
    }

    items.push({
      productId: data.product_id,
      quantity: data.quantity,
    })
  }

  return {
    success: true,
    items,
  }
}

export function validateAffiliateReference(
  value: unknown,
): string | null {
  if (!isNonEmptyString(value, 128)) {
    return null
  }

  return value.trim()
}
