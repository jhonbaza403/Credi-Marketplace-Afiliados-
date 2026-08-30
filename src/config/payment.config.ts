// ==========================================================
// Payment Configuration
// ==========================================================


export const PAYMENT_CONFIG = {


 provider:

  process.env.PAYMENT_PROVIDER
  ??
  'manual',



 supportedMethods:[

  'binance_pay',

  'usdt_trc20',

  'bank_transfer'

 ] as const,



 webhookTimeout:

  30000,



 retryAttempts:

  5,


} as const;
