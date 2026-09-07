// ==========================================================
// ARCHIVO: src/env.ts
// Credi Marketplace
//
// Validación centralizada y tipada de variables de entorno.
// La validación es diferida para no romper la recolección de
// configuración de Next.js durante `next build` cuando Vercel
// todavía no ha inyectado variables runtime.
//
// Next.js 16.3 + React 19 + Node.js 24 + Supabase
// ==========================================================

import "server-only";
import { z } from "zod";

const nonEmptyString = z
  .string()
  .trim()
  .min(1, "El valor no puede estar vacío");

const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: nonEmptyString.optional(),
  SUPABASE_SERVICE_ROLE_KEY: nonEmptyString.optional(),
  DATABASE_URL: nonEmptyString.optional(),
  GEMINI_API_KEY: nonEmptyString.optional(),
  STRIPE_SECRET_KEY: nonEmptyString.optional(),
  STRIPE_WEBHOOK_SECRET: nonEmptyString.optional(),
  B2B_CRYPTO_ENABLED: z.enum(["true", "false"]).default("false"),
  B2B_CRYPTO_MERCHANT_COUNTRY: z
    .string()
    .trim()
    .length(2)
    .transform((value) => value.toUpperCase())
    .default("US"),
});

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .trim()
    .url("NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .trim()
    .min(1, "Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .trim()
    .url("NEXT_PUBLIC_APP_URL debe ser una URL válida")
    .default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z
    .string()
    .trim()
    .min(1)
    .default("Credi Marketplace"),
  NEXT_PUBLIC_DEFAULT_LOCALE: z
    .string()
    .trim()
    .min(2)
    .max(10)
    .default("es"),
  NEXT_PUBLIC_DEFAULT_CURRENCY: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .default("USD"),
  NEXT_PUBLIC_DEFAULT_COUNTRY: z
    .string()
    .trim()
    .length(2)
    .transform((value) => value.toUpperCase())
    .default("VE"),
  NEXT_PUBLIC_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
});

function readServerEnv() {
  return serverEnvSchema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    B2B_CRYPTO_ENABLED: process.env.B2B_CRYPTO_ENABLED,
    B2B_CRYPTO_MERCHANT_COUNTRY: process.env.B2B_CRYPTO_MERCHANT_COUNTRY,
  });
}

function readPublicEnv() {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
    NEXT_PUBLIC_DEFAULT_CURRENCY: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY,
    NEXT_PUBLIC_DEFAULT_COUNTRY: process.env.NEXT_PUBLIC_DEFAULT_COUNTRY,
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
  });
}

// Getters garantizan que ninguna variable sea evaluada durante la
// importación del módulo. La validación ocurre solo cuando una ruta
// o servicio realmente accede a `env.X`.
export const env = {
  get SUPABASE_SECRET_KEY() {
    return readServerEnv().SUPABASE_SECRET_KEY;
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return readServerEnv().SUPABASE_SERVICE_ROLE_KEY;
  },
  get DATABASE_URL() {
    return readServerEnv().DATABASE_URL;
  },
  get GEMINI_API_KEY() {
    return readServerEnv().GEMINI_API_KEY;
  },
  get STRIPE_SECRET_KEY() {
    return readServerEnv().STRIPE_SECRET_KEY;
  },
  get STRIPE_WEBHOOK_SECRET() {
    return readServerEnv().STRIPE_WEBHOOK_SECRET;
  },
  get B2B_CRYPTO_ENABLED() {
    return readServerEnv().B2B_CRYPTO_ENABLED;
  },
  get B2B_CRYPTO_MERCHANT_COUNTRY() {
    return readServerEnv().B2B_CRYPTO_MERCHANT_COUNTRY;
  },
  get NEXT_PUBLIC_SUPABASE_URL() {
    return readPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
  },
  get NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY() {
    return readPublicEnv().NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  },
  get NEXT_PUBLIC_APP_URL() {
    return readPublicEnv().NEXT_PUBLIC_APP_URL;
  },
  get NEXT_PUBLIC_APP_NAME() {
    return readPublicEnv().NEXT_PUBLIC_APP_NAME;
  },
  get NEXT_PUBLIC_DEFAULT_LOCALE() {
    return readPublicEnv().NEXT_PUBLIC_DEFAULT_LOCALE;
  },
  get NEXT_PUBLIC_DEFAULT_CURRENCY() {
    return readPublicEnv().NEXT_PUBLIC_DEFAULT_CURRENCY;
  },
  get NEXT_PUBLIC_DEFAULT_COUNTRY() {
    return readPublicEnv().NEXT_PUBLIC_DEFAULT_COUNTRY;
  },
  get NEXT_PUBLIC_ENV() {
    return readPublicEnv().NEXT_PUBLIC_ENV;
  },
};

export type Env = {
  readonly [K in keyof typeof env]: typeof env[K];
};
