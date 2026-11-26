// Legacy service facade. All order creation now uses the canonical transactional
// RPC and the same server-side identity checks as the API checkout flow.
export {
  createOrder,
} from '@/lib/orders/create-order'

export type {
  CreateOrderInput,
  CreateOrderResult,
} from '@/lib/orders/create-order'
