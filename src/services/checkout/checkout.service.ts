import { createOrder } from '@/lib/orders/create-order'
import type { ServerOrderItem } from '@/lib/orders/validate-order'

export interface CheckoutInput {
  userId: string
  items: Array<ServerOrderItem & { price?: number }>
  currency?: string
  paymentProvider?: string
  affiliateRef?: string | null
  region?: string | null
  idempotencyKey?: string | null
}

export interface CheckoutResult {
  order: Awaited<ReturnType<typeof createOrder>>
  payment: {
    provider: 'stripe'
    status: 'requires_checkout'
    endpoint: '/api/checkout'
    requestBody: {
      order_id: string
      payment_method: 'stripe'
      region: string
    }
  }
}

/**
 * Creates the order only. A provider checkout session must be created through
 * POST /api/checkout, which verifies ownership, reads the persisted order total,
 * creates payment_orchestrations and returns the signed provider checkout URL.
 * The optional item.price is accepted for legacy callers but is never trusted.
 */
export async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const provider = (input.paymentProvider ?? 'stripe').trim().toLowerCase()
  if (provider !== 'stripe') throw new Error('PAYMENT_PROVIDER_NOT_IMPLEMENTED')

  const order = await createOrder({
    userId: input.userId,
    items: input.items.map(({ productId, quantity }) => ({ productId, quantity })),
    affiliateRef: input.affiliateRef,
    region: input.region,
    idempotencyKey: input.idempotencyKey,
  })

  return {
    order,
    payment: {
      provider: 'stripe',
      status: 'requires_checkout',
      endpoint: '/api/checkout',
      requestBody: {
        order_id: order.orderId,
        payment_method: 'stripe',
        region: input.region?.trim().toUpperCase() || 'GLOBAL',
      },
    },
  }
}
