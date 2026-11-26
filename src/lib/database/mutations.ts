import {
  getDatabaseServerClient,
} from './server'

// Product writes remain available through the user's RLS-scoped session.
// Inventory, order and payment state must use their canonical transactional
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
export async function createOrder(_payload: Record<string, unknown>): Promise<never> {
  throw new Error('DIRECT_ORDER_INSERT_DISABLED_USE_CANONICAL_ORDER_SERVICE')
}

/** @deprecated Only verified webhooks and protected state-transition RPCs may change payment/order status. */
export async function updateOrderStatus(
  _orderId: string,
  _status: string,
): Promise<never> {
  throw new Error('DIRECT_ORDER_STATUS_UPDATE_DISABLED_USE_ORDER_STATE_MACHINE')
}

/** @deprecated Inventory changes must be audited and applied through stock receipt/adjustment workflows. */
export async function updateInventory(
  _productId: string,
  _quantity: number,
): Promise<never> {
  throw new Error('DIRECT_INVENTORY_UPDATE_DISABLED_USE_INVENTORY_WORKFLOW')
}
