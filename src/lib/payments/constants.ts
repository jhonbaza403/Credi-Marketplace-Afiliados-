import type { PaymentProvider } from './types'

export const PAYMENT_PROVIDERS: readonly PaymentProvider[] =
  [
    'paypal',
    'binance_pay',
    'usdt',
    'bank_transfer',
  ] as const

export const PAYMENT_EXPIRATION_MINUTES = 30

export const MAX_PAYMENT_AMOUNT = 100_000_000

export const PLATFORM_COMMISSION_RATE = Number(
  process.env.PLATFORM_COMMISSION_RATE ?? '0.05',
)

export const PAYMENT_CURRENCIES = [
  'USD',
  'USDT',
] as const
