import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { initializeOrderTax } from '@/lib/taxation/engine'

import {
  validateServerOrder,
  type ServerOrderItem,
} from './validate-order'
import {
  normalizeOrderBatchItems,
  resolveOrderIdempotencyKey,
} from './order-batch'

export interface CreateOrderInput {
  userId: string
  items: ServerOrderItem[]
  affiliateRef?: string | null
  region?: string | null
  idempotencyKey?: string | null
}

export interface CreateOrderResult {
  orderId: string
  totalAmount: number
  commissionAmount: number
  currency: string
  status: string
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  if (!input.userId) throw new Error('UNAUTHENTICATED')

  const normalizedItems = normalizeOrderBatchItems(input.items)
  validateServerOrder(normalizedItems.map((item) => ({
    productId: item.product_id,
    quantity: item.quantity,
  })))

  const sessionClient = await createClient()
  const { data: { user }, error: authError } = await sessionClient.auth.getUser()
  if (authError || !user) throw new Error('UNAUTHENTICATED')
  if (user.id !== input.userId) throw new Error('ORDER_BUYER_MISMATCH')

  const idempotencyKey = resolveOrderIdempotencyKey(input.idempotencyKey)
  const region = typeof input.region === 'string' && input.region.trim()
    ? input.region.trim().toUpperCase().slice(0, 32)
    : 'GLOBAL'
  const affiliateRef = input.affiliateRef?.trim() || null

  // The canonical RPC is service-role only. The user identity is verified above;
  // prices, seller, totals and inventory are resolved inside PostgreSQL.
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('create_pending_order_batch', {
    p_buyer_id: user.id,
    p_items: normalizedItems,
    p_affiliate_ref: affiliateRef,
    p_region: region,
    p_idempotency_key: idempotencyKey,
  })

  if (error) {
    console.error('[orders] Canonical order RPC failed:', error)
    throw new Error('ORDER_CREATION_FAILED')
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result || typeof result.order_id !== 'string') {
    throw new Error('INVALID_ORDER_RESPONSE')
  }

  await initializeOrderTax(sessionClient, result.order_id)

  return {
    orderId: result.order_id,
    totalAmount: Number(result.total_amount) || 0,
    commissionAmount: Number(result.commission_amount) || 0,
    currency: typeof result.currency === 'string' ? result.currency.trim() : 'USD',
    status: typeof result.status === 'string' ? result.status : 'pending',
  }
}
