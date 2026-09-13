import { createClient } from '@/lib/supabase/server'

import {
  validateServerOrder,
  type ServerOrderItem,
} from './validate-order'

export interface CreateOrderInput {
  userId: string
  items: ServerOrderItem[]
  affiliateRef?: string | null
}

export interface CreateOrderResult {
  orderId: string
  totalAmount: number
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  validateServerOrder(input.items)

  if (!input.userId) {
    throw new Error('UNAUTHENTICATED')
  }

  if (input.items.length !== 1) {
    throw new Error('MULTI_ITEM_ORDER_NOT_IMPLEMENTED')
  }

  const item = input.items[0]
  const supabase = await createClient()
  const idempotencyKey = crypto.randomUUID()

  const { data, error } = await supabase.rpc(
    'create_pending_order_batch',
    {
      p_buyer_id: input.userId,
      p_items: [{ productId: item.productId, quantity: item.quantity }],
      p_affiliate_ref: input.affiliateRef ?? null,
      p_region: 'GLOBAL',
      p_idempotency_key: idempotencyKey,
    },
  )

  if (error) {
    console.error('[orders] RPC error:', error)
    throw new Error('ORDER_CREATION_FAILED')
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result || typeof result.order_id !== 'string') {
    throw new Error('INVALID_ORDER_RESPONSE')
  }

  const { error: taxError } = await supabase.rpc(
    'initialize_order_tax_transaction',
    { p_order_id: result.order_id },
  )

  if (taxError) {
    console.error('[orders] Tax initialization error:', taxError)
    throw new Error('ORDER_TAX_INITIALIZATION_FAILED')
  }

  return {
    orderId: result.order_id,
    totalAmount: Number(result.total_amount) || 0,
  }
}
