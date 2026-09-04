// ==========================================================
// Credi Marketplace — Payment Configuration
// ==========================================================

export const PAYMENT_CONFIG = {
  provider: process.env.PAYMENT_PROVIDER ?? "manual",

  supportedMethods: [
    "card",
    "bank_transfer",
    "stablecoin",
  ] as const,

  crypto: {
    provider: process.env.CRYPTO_PAYMENT_PROVIDER ?? "stripe",
    currencies: ["USDC", "USDP", "USDG"] as const,
    settlementCurrency: "USD" as const,
    custody: false,
  },

  webhookTimeout: 30000,
  retryAttempts: 5,
} as const;
