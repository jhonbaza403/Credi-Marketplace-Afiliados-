export type PaymentProvider =
  | 'paypal'
  | 'binance_pay'
  | 'usdt'
  | 'bank_transfer'

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'

export interface PaymentRequest {
  orderId: string
  amount: number
  currency: string
  provider: PaymentProvider
}

export interface PaymentResult {
  success: boolean
  paymentId?: string
  status: PaymentStatus
  provider: PaymentProvider
}

export interface PaymentWebhookEvent {
  provider: PaymentProvider
  eventId: string
  eventType: string
  paymentId?: string
  orderId?: string
  status: PaymentStatus
  amount?: number
  currency?: string
  raw: unknown
}
