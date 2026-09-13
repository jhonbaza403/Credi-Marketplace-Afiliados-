import type { SupabaseClient } from '@supabase/supabase-js'

export type MerchantModel = 'marketplace_intermediary' | 'merchant_of_record' | 'hybrid'
export type TaxCalculationStatus = 'not_configured' | 'calculated' | 'review_required'

export interface TaxSnapshot {
  engine_version: string
  calculation_status: TaxCalculationStatus
  merchant_model: MerchantModel
  order_id: string
  buyer_id: string
  seller_id: string | null
  region: string
  jurisdiction_code: string
  jurisdiction_country: string
  tax_category_code: string
  gross_amount: number
  taxable_amount: number
  tax_amount: number
  currency: string
  snapshot_at: string
  reason: string
}

export async function initializeOrderTax(
  supabase: SupabaseClient,
  orderId: string,
): Promise<string> {
  if (!orderId) throw new Error('ORDER_ID_REQUIRED')

  const { data, error } = await supabase.rpc(
    'initialize_order_tax_transaction',
    { p_order_id: orderId },
  )

  if (error) {
    console.error('[taxation] initialization error:', error)
    throw new Error('ORDER_TAX_INITIALIZATION_FAILED')
  }

  if (typeof data !== 'string') throw new Error('INVALID_TAX_TRANSACTION_RESPONSE')
  return data
}

export async function prepareSettlement(
  serviceSupabase: SupabaseClient,
  orderId: string,
): Promise<number> {
  if (!orderId) throw new Error('ORDER_ID_REQUIRED')

  const { data, error } = await serviceSupabase.rpc(
    'finalize_order_settlement_allocations',
    { p_order_id: orderId },
  )

  if (error) {
    console.error('[taxation] settlement preparation error:', error)
    throw new Error('SETTLEMENT_ALLOCATION_FAILED')
  }

  return Number(data) || 0
}
