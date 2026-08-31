import { roundMoney } from '@/lib/validation/common'

export interface OrderCalculationItem {
  unitPrice: number
  quantity: number
}

export interface OrderCalculation {
  subtotal: number
  total: number
}

export function calculateOrder(
  items: OrderCalculationItem[],
): OrderCalculation {
  let subtotalCents = 0

  for (const item of items) {
    const unitPriceCents =
      Math.round(
        roundMoney(item.unitPrice) * 100,
      )

    subtotalCents +=
      unitPriceCents * item.quantity
  }

  const subtotal =
    subtotalCents / 100

  return {
    subtotal,
    total: subtotal,
  }
}
