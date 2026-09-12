import type { SupabaseClient } from '@supabase/supabase-js'
import { buildPaymentMetadata, isValidMoney } from '@/lib/payments/orchestrator'

const env = (name: string, fallback: string) => process.env[name]?.trim() || fallback

export async function getPayableOrder(supabase: SupabaseClient, orderId: string, userId: string) {
  const { data, error } = await supabase.from('orders').select('id,buyer_id,total_amount,currency,status,payment_status').eq('id', orderId).eq('buyer_id', userId).maybeSingle()
  if (error) throw new Error('ORDER_LOOKUP_FAILED')
  if (!data) throw new Error('ORDER_NOT_FOUND')
  if (data.status === 'paid' || data.payment_status === 'paid') throw new Error('ORDER_ALREADY_PAID')
  if (data.status !== 'pending' || data.payment_status !== 'pending') throw new Error('ORDER_NOT_PAYABLE')
  const amount = Number(data.total_amount)
  if (!isValidMoney(amount)) throw new Error('INVALID_ORDER_TOTAL')
  const currency = String(data.currency || 'USD').trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('INVALID_CURRENCY')
  return { ...data, amount, currency }
}

export function railDetails(method: string) {
  if (method === 'crypto') return { asset: env('CREDI_CRYPTO_ASSET', 'USDC'), network: env('CREDI_CRYPTO_NETWORK', 'Configure CREDI_CRYPTO_NETWORK'), address: env('CREDI_CRYPTO_PAYMENT_ADDRESS', 'Configure CREDI_CRYPTO_PAYMENT_ADDRESS'), instructions: 'Realiza el pago exacto y conserva el hash de la transacción.' }
  if (method === 'bank_transfer') return { bank_name: env('CREDI_BANK_NAME', 'Configure CREDI_BANK_NAME'), account_name: env('CREDI_BANK_ACCOUNT_NAME', 'Configure CREDI_BANK_ACCOUNT_NAME'), account: env('CREDI_BANK_ACCOUNT', 'Configure CREDI_BANK_ACCOUNT'), routing: process.env.CREDI_BANK_ROUTING?.trim() || null, swift: process.env.CREDI_BANK_SWIFT?.trim() || null, instructions: 'Realiza la transferencia por el importe exacto y conserva la referencia bancaria.' }
  return { instructions: env('CREDI_MANUAL_PAYMENT_INSTRUCTIONS', 'Completa el pago según las instrucciones del administrador.') }
}

export function paymentMetadata(method: string, orderId: string) {
  return buildPaymentMetadata({ source: 'payment-orchestrator', requested_method: method, order_id: orderId, requested_at: new Date().toISOString() })
}
