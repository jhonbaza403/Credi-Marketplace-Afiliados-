import { createClient } from '@/lib/supabase/server'

export type PaymentStatus =
  | 'created'
  | 'pending'
  | 'requires_action'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'expired'

export interface CreatePaymentIntentInput {
  orderId: string
  userId: string
  amount: number
  currency: string
  provider: string
}

/**
 * Compatibility reader for existing callers. Payment sessions are created only
 * by POST /api/checkout, after that route re-reads the persisted order total.
 * This function never inserts into legacy payment_intents.
 */
export async function createPaymentIntent(input: CreatePaymentIntentInput) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('UNAUTHENTICATED')
  if (input.userId !== user.id) throw new Error('PAYMENT_BUYER_MISMATCH')
  if (input.provider.trim().toLowerCase() !== 'stripe') {
    throw new Error('PAYMENT_PROVIDER_NOT_IMPLEMENTED')
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id,buyer_id,total_amount,currency')
    .eq('id', input.orderId)
    .eq('buyer_id', user.id)
    .maybeSingle()

  if (orderError) throw new Error(orderError.message)
  if (!order) throw new Error('ORDER_NOT_FOUND')

  const requestedAmount = Math.round(input.amount * 100)
  const persistedAmount = Math.round(Number(order.total_amount) * 100)
  if (!Number.isSafeInteger(requestedAmount) || requestedAmount !== persistedAmount) {
    throw new Error('PAYMENT_AMOUNT_MISMATCH')
  }
  if (order.currency.trim().toUpperCase() !== input.currency.trim().toUpperCase()) {
    throw new Error('PAYMENT_CURRENCY_MISMATCH')
  }

  const { data, error } = await supabase
    .from('payment_orchestrations')
    .select('id,order_id,user_id,amount,currency,method_type,provider,status,provider_reference,metadata,created_at')
    .eq('order_id', input.orderId)
    .eq('user_id', user.id)
    .eq('provider', 'stripe')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('USE_API_CHECKOUT_TO_CREATE_PAYMENT')
  return data
}

export async function getPaymentByOrderId(orderId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('UNAUTHENTICATED')

  const { data, error } = await supabase
    .from('payment_orchestrations')
    .select('id,order_id,user_id,amount,currency,method_type,provider,status,provider_reference,metadata,created_at,updated_at')
    .eq('order_id', orderId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}
