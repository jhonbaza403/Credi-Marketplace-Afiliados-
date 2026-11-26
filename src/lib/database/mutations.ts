import {
  getDatabaseServerClient,
} from './server'

// Product writes remain available through the user's RLS-scoped session.
// Inventory, order and payment state must use canonical transactional
// services/RPCs; they are deliberately not generic table mutations.

export async function createProduct(payload: Record<string, unknown>) {
  if ('stock' in payload) {
    throw new Error('INITIAL_STOCK_MUST_USE_INVENTORY_WORKFLOW')
  }

  const supabase = await getDatabaseServerClient()
  const { data, error } = await supabase
    .from('products')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateProduct(id: string, payload: Record<string, unknown>) {
  if ('stock' in payload) {
    throw new Error('INVENTORY_MUST_USE_INVENTORY_WORKFLOW')
  }

  const supabase = await getDatabaseServerClient()
  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/** @deprecated Direct inserts bypass reservations, affiliate attribution and tax. */
export async function createOrder(payload: Record<string, unknown>): Promise<never> {
  if (!payload || typeof payload !== 'object') {
    throw new Error('INVALID_ORDER_PAYLOAD')
  }
  throw new Error('DIRECT_ORDER_INSERT_DISABLED_USE_CANONICAL_ORDER_SERVICE')
}

/** @deprecated Only verified webhooks and protected state-transition RPCs may change order status. */
export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<never> {
  if (!orderId.trim() || !status.trim()) {
    throw new Error('INVALID_ORDER_STATE_TRANSITION')
  }
  throw new Error('DIRECT_ORDER_STATUS_UPDATE_DISABLED_USE_ORDER_STATE_MACHINE')
}

/** @deprecated Inventory changes must be audited and applied through stock receipt/adjustment workflows. */
export async function updateInventory(
  productId: string,
  quantity: number,
): Promise<never> {
  if (!productId.trim() || !Number.isSafeInteger(quantity) || quantity < 0) {
    throw new Error('INVALID_INVENTORY_ADJUSTMENT')
  }
  throw new Error('DIRECT_INVENTORY_UPDATE_DISABLED_USE_INVENTORY_WORKFLOW')
}
