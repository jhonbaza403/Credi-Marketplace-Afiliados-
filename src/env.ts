// ==========================================================
// ARCHIVO: src/env.ts
// Credi Marketplace
//
// Validación centralizada y tipada de variables de entorno
// Next.js 16.3 + React 19 + Node.js 22 + Supabase
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
});

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .trim()
    .min(1, "Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  NEXT_PUBLIC_APP_URL: z
    .string()
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

const serverEnv = serverEnvSchema.parse({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
});

const publicEnv = publicEnvSchema.parse({
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

export const env = {
  ...serverEnv,
  ...publicEnv,
} as const;

export type Env = typeof env;
