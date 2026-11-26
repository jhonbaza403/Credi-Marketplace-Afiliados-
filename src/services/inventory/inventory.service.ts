import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface InventoryItem {
  productId: string
  quantity: number
}

export interface StockReservation {
  productId: string
  quantity: number
  orderId: string
}

function normalizeInventoryItems(items: InventoryItem[]): InventoryItem[] {
  if (!Array.isArray(items) || items.length === 0) throw new Error('INVALID_INVENTORY_ITEMS')

  const totals = new Map<string, number>()
  for (const item of items) {
    if (!item || typeof item.productId !== 'string' || !/^[0-9a-f-]{36}$/i.test(item.productId)) {
      throw new Error('INVALID_PRODUCT_ID')
    }
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) {
      throw new Error('INVALID_QUANTITY')
    }
    const productId = item.productId.toLowerCase()
    const total = (totals.get(productId) ?? 0) + item.quantity
    if (total > 100) throw new Error('QUANTITY_LIMIT_EXCEEDED')
    totals.set(productId, total)
  }
  return Array.from(totals, ([productId, quantity]) => ({ productId, quantity }))
}

async function requireUser() {
  const client = await createClient()
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) throw new Error('UNAUTHENTICATED')
  return { client, user }
}

/**
 * available_quantity already excludes reserved units: create_pending_order_batch
 * decrements it and increments reserved_quantity in the same transaction.
 */
export async function getProductStock(productId: string) {
  const { client } = await requireUser()
  const { data: product, error: productError } = await client
    .from('products')
    .select('id,stock,is_active')
    .eq('id', productId)
    .maybeSingle()

  if (productError) throw new Error(productError.message)
  if (!product || !product.is_active) throw new Error('PRODUCT_NOT_AVAILABLE')

  const admin = createAdminClient()
  const { data: inventory, error } = await admin
    .from('inventory')
    .select('available_quantity,reserved_quantity')
    .eq('product_id', productId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return {
    available_quantity: inventory?.available_quantity ?? product.stock,
    reserved_quantity: inventory?.reserved_quantity ?? 0,
  }
}

export async function checkAvailability(items: InventoryItem[]) {
  const normalized = normalizeInventoryItems(items)
  const stocks = await Promise.all(normalized.map(async (item) => ({
    item,
    stock: await getProductStock(item.productId),
  })))
  return stocks.every(({ item, stock }) => stock.available_quantity >= item.quantity)
}

/**
 * Reservation is performed atomically by create_pending_order_batch. This
 * compatibility method verifies that reservation rather than reserving twice.
 */
export async function reserveInventory(orderId: string, items: InventoryItem[]) {
  const expected = normalizeInventoryItems(items)
  const { client, user } = await requireUser()
  const { data: order, error: orderError } = await client
    .from('orders')
    .select('id,buyer_id,status')
    .eq('id', orderId)
    .eq('buyer_id', user.id)
    .maybeSingle()

  if (orderError) throw new Error(orderError.message)
  if (!order) throw new Error('ORDER_NOT_FOUND')

  const admin = createAdminClient()
  const { data: reservations, error } = await admin
    .from('inventory_reservations')
    .select('product_id,quantity')
    .eq('order_id', orderId)
    .eq('status', 'reserved')

  if (error) throw new Error(error.message)

  const actual = new Map<string, number>()
  for (const row of reservations ?? []) {
    actual.set(row.product_id, (actual.get(row.product_id) ?? 0) + Number(row.quantity))
  }

  const matches = expected.every((item) => actual.get(item.productId) === item.quantity)
    && actual.size === expected.length
  if (!matches) throw new Error('ORDER_RESERVATION_NOT_FOUND')

  return { status: 'already_reserved' as const, orderId }
}

/**
 * Releasing inventory is a state transition, not a stock update. The database
 * RPC rejects cancellation once a payment attempt/session exists.
 */
export async function releaseInventory(orderId: string) {
  const { client } = await requireUser()
  const { data, error } = await client.rpc('cancel_pending_order', {
    p_order_id: orderId,
  })
  if (error) throw new Error(error.message)
  return data
}
