import "server-only";
import { z } from "zod";

const nonEmptyString = z.string().trim().min(1, "El valor no puede estar vacío");

const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: nonEmptyString.optional(),
  SUPABASE_SERVICE_ROLE_KEY: nonEmptyString.optional(),
  DATABASE_URL: nonEmptyString.optional(),
  GEMINI_API_KEY: nonEmptyString.optional(),
  GEMINI_MODEL: nonEmptyString.optional(),
  GEMINI_PRODUCT_MODEL: nonEmptyString.optional(),
  AI_MODEL: nonEmptyString.optional(),
  AI_MAX_INPUT_LENGTH: z.coerce.number().int().positive().max(100000).optional(),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().max(100000).optional(),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().max(120000).optional(),
  STRIPE_SECRET_KEY: nonEmptyString.optional(),
  STRIPE_WEBHOOK_SECRET: nonEmptyString.optional(),
  COINBASE_BUSINESS_API_KEY_NAME: nonEmptyString.optional(),
  COINBASE_BUSINESS_API_KEY_SECRET: nonEmptyString.optional(),
  COINBASE_BUSINESS_WEBHOOK_SECRET: nonEmptyString.optional(),
  TWILIO_ACCOUNT_SID: nonEmptyString.optional(),
  TWILIO_AUTH_TOKEN: nonEmptyString.optional(),
  AGENT_APPROVAL_SECRET: nonEmptyString.optional(),
  CREDI_AGENT_MAX_PAYMENT_AMOUNT: z.coerce.number().nonnegative().optional(),
  CREDI_BANK_ROUTING: nonEmptyString.optional(),
  CREDI_BANK_SWIFT: nonEmptyString.optional(),
  CRYPTO_PAYMENT_PROVIDER: nonEmptyString.optional(),
  PAYMENT_PROVIDER: nonEmptyString.optional(),
  PLATFORM_COMMISSION_RATE: z.coerce.number().min(0).max(1).optional(),
  RATE_LIMIT_ENABLED: z.enum(["true","false"]).default("true"),
  B2B_CRYPTO_ENABLED: z.enum(["true", "false"]).default("false"),
  B2B_CRYPTO_MERCHANT_COUNTRY: z.string().trim().length(2).transform((value) => value.toUpperCase()).default("US"),
});

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().trim().url("NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: nonEmptyString,
  NEXT_PUBLIC_APP_URL: z.string().trim().url("NEXT_PUBLIC_APP_URL debe ser una URL válida").default("https://credi-marketplace-afiliados.vercel.app"),
  NEXT_PUBLIC_APP_NAME: nonEmptyString.default("Credi Marketplace"),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.string().trim().min(2).max(10).default("es"),
  NEXT_PUBLIC_DEFAULT_CURRENCY: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("USD"),
  NEXT_PUBLIC_DEFAULT_COUNTRY: z.string().trim().length(2).transform((value) => value.toUpperCase()).default("VE"),
  NEXT_PUBLIC_ENV: z.enum(["development", "staging", "production"]).default("development"),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;
type PublicEnv = z.infer<typeof publicEnvSchema>;

let serverEnvCache: ServerEnv | undefined;
let publicEnvCache: PublicEnv | undefined;

function readServerEnv(): ServerEnv {
  if (serverEnvCache) return serverEnvCache;
  serverEnvCache = serverEnvSchema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    GEMINI_PRODUCT_MODEL: process.env.GEMINI_PRODUCT_MODEL,
    AI_MODEL: process.env.AI_MODEL,
    AI_MAX_INPUT_LENGTH: process.env.AI_MAX_INPUT_LENGTH,
    AI_MAX_OUTPUT_TOKENS: process.env.AI_MAX_OUTPUT_TOKENS,
    AI_REQUEST_TIMEOUT_MS: process.env.AI_REQUEST_TIMEOUT_MS,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    COINBASE_BUSINESS_API_KEY_NAME: process.env.COINBASE_BUSINESS_API_KEY_NAME,
    COINBASE_BUSINESS_API_KEY_SECRET: process.env.COINBASE_BUSINESS_API_KEY_SECRET,
    COINBASE_BUSINESS_WEBHOOK_SECRET: process.env.COINBASE_BUSINESS_WEBHOOK_SECRET,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    AGENT_APPROVAL_SECRET: process.env.AGENT_APPROVAL_SECRET,
    CREDI_AGENT_MAX_PAYMENT_AMOUNT: process.env.CREDI_AGENT_MAX_PAYMENT_AMOUNT,
    CREDI_BANK_ROUTING: process.env.CREDI_BANK_ROUTING,
    CREDI_BANK_SWIFT: process.env.CREDI_BANK_SWIFT,
    CRYPTO_PAYMENT_PROVIDER: process.env.CRYPTO_PAYMENT_PROVIDER,
    PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
    PLATFORM_COMMISSION_RATE: process.env.PLATFORM_COMMISSION_RATE,
    RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED,
    B2B_CRYPTO_ENABLED: process.env.B2B_CRYPTO_ENABLED,
    B2B_CRYPTO_MERCHANT_COUNTRY: process.env.B2B_CRYPTO_MERCHANT_COUNTRY,
  });
  return serverEnvCache;
}

function resolvePublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
}

function readPublicEnv(): PublicEnv {
  if (publicEnvCache) return publicEnvCache;
  publicEnvCache = publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: resolvePublishableKey(),
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
    NEXT_PUBLIC_DEFAULT_CURRENCY: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY,
    NEXT_PUBLIC_DEFAULT_COUNTRY: process.env.NEXT_PUBLIC_DEFAULT_COUNTRY,
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
  });
  return publicEnvCache;
}

export const env = {
  get SUPABASE_SECRET_KEY() { return readServerEnv().SUPABASE_SECRET_KEY; },
  get SUPABASE_SERVICE_ROLE_KEY() { return readServerEnv().SUPABASE_SERVICE_ROLE_KEY; },
  get DATABASE_URL() { return readServerEnv().DATABASE_URL; },
  get GEMINI_API_KEY() { return readServerEnv().GEMINI_API_KEY; },
  get GEMINI_MODEL() { return readServerEnv().GEMINI_MODEL; },
  get GEMINI_PRODUCT_MODEL() { return readServerEnv().GEMINI_PRODUCT_MODEL; },
  get AI_MODEL() { return readServerEnv().AI_MODEL; },
  get AI_MAX_INPUT_LENGTH() { return readServerEnv().AI_MAX_INPUT_LENGTH; },
  get AI_MAX_OUTPUT_TOKENS() { return readServerEnv().AI_MAX_OUTPUT_TOKENS; },
  get AI_REQUEST_TIMEOUT_MS() { return readServerEnv().AI_REQUEST_TIMEOUT_MS; },
  get STRIPE_SECRET_KEY() { return readServerEnv().STRIPE_SECRET_KEY; },
  get STRIPE_WEBHOOK_SECRET() { return readServerEnv().STRIPE_WEBHOOK_SECRET; },
  get COINBASE_BUSINESS_API_KEY_NAME() { return readServerEnv().COINBASE_BUSINESS_API_KEY_NAME; },
  get COINBASE_BUSINESS_API_KEY_SECRET() { return readServerEnv().COINBASE_BUSINESS_API_KEY_SECRET; },
  get COINBASE_BUSINESS_WEBHOOK_SECRET() { return readServerEnv().COINBASE_BUSINESS_WEBHOOK_SECRET; },
  get TWILIO_ACCOUNT_SID() { return readServerEnv().TWILIO_ACCOUNT_SID; },
  get TWILIO_AUTH_TOKEN() { return readServerEnv().TWILIO_AUTH_TOKEN; },
  get AGENT_APPROVAL_SECRET() { return readServerEnv().AGENT_APPROVAL_SECRET; },
  get CREDI_AGENT_MAX_PAYMENT_AMOUNT() { return readServerEnv().CREDI_AGENT_MAX_PAYMENT_AMOUNT; },
  get CREDI_BANK_ROUTING() { return readServerEnv().CREDI_BANK_ROUTING; },
  get CREDI_BANK_SWIFT() { return readServerEnv().CREDI_BANK_SWIFT; },
  get CRYPTO_PAYMENT_PROVIDER() { return readServerEnv().CRYPTO_PAYMENT_PROVIDER; },
  get PAYMENT_PROVIDER() { return readServerEnv().PAYMENT_PROVIDER; },
  get PLATFORM_COMMISSION_RATE() { return readServerEnv().PLATFORM_COMMISSION_RATE; },
  get RATE_LIMIT_ENABLED() { return readServerEnv().RATE_LIMIT_ENABLED; },
  get B2B_CRYPTO_ENABLED() { return readServerEnv().B2B_CRYPTO_ENABLED; },
  get B2B_CRYPTO_MERCHANT_COUNTRY() { return readServerEnv().B2B_CRYPTO_MERCHANT_COUNTRY; },
  get NEXT_PUBLIC_SUPABASE_URL() { return readPublicEnv().NEXT_PUBLIC_SUPABASE_URL; },
  get NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY() { return readPublicEnv().NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; },
  get NEXT_PUBLIC_APP_URL() { return readPublicEnv().NEXT_PUBLIC_APP_URL; },
  get NEXT_PUBLIC_APP_NAME() { return readPublicEnv().NEXT_PUBLIC_APP_NAME; },
  get NEXT_PUBLIC_DEFAULT_LOCALE() { return readPublicEnv().NEXT_PUBLIC_DEFAULT_LOCALE; },
  get NEXT_PUBLIC_DEFAULT_CURRENCY() { return readPublicEnv().NEXT_PUBLIC_DEFAULT_CURRENCY; },
  get NEXT_PUBLIC_DEFAULT_COUNTRY() { return readPublicEnv().NEXT_PUBLIC_DEFAULT_COUNTRY; },
  get NEXT_PUBLIC_ENV() { return readPublicEnv().NEXT_PUBLIC_ENV; },
};

export type Env = {
  readonly [K in keyof typeof env]: typeof env[K];
};
