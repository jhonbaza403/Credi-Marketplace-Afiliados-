// ==========================================================
// ARCHIVO: src/env.ts
// Credi Marketplace
//
// Validación centralizada y tipada de variables de entorno
// Next.js 16.3 + React 19 + Node.js 24 + Supabase
// ==========================================================

import "server-only";

import { z } from "zod";

/* ==========================================================
   HELPERS
   ========================================================== */

const optionalUrl = z
  .string()
  .url("Debe ser una URL válida")
  .optional();

const nonEmptyString = z
  .string()
  .trim()
  .min(1, "El valor no puede estar vacío");

/* ==========================================================
   SERVER ENVIRONMENT
   ----------------------------------------------------------
   NUNCA utilizar estas variables desde Client Components.
   ========================================================== */

const serverEnvSchema = z.object({
  /**
   * Supabase Secret Key.
   *
   * Sustituye progresivamente a:
   * SUPABASE_SERVICE_ROLE_KEY
   *
   * JAMÁS debe llegar al navegador.
   */
  SUPABASE_SECRET_KEY: nonEmptyString.optional(),

  /**
   * Legacy Supabase service role key.
   *
   * Se mantiene temporalmente únicamente para migraciones
   * o compatibilidad con código existente.
   */
  SUPABASE_SERVICE_ROLE_KEY: nonEmptyString.optional(),

  /**
   * Conexión directa a PostgreSQL.
   *
   * Solo servidor.
   */
  DATABASE_URL: nonEmptyString.optional(),

  /**
   * Google Gemini.
   *
   * Solo servidor.
   */
  GEMINI_API_KEY: nonEmptyString.optional(),
});

/* ==========================================================
   PUBLIC ENVIRONMENT
   ----------------------------------------------------------
   Estas variables pueden llegar al navegador.
   ========================================================== */

const publicEnvSchema = z.object({
  /**
   * URL pública de Supabase.
   */
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida"),

  /**
   * Nueva Publishable Key de Supabase.
   *
   * Formato esperado:
   * sb_publishable_...
   */
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .trim()
    .min(
      1,
      "Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ),

  /**
   * URL pública de la aplicación.
   */
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL debe ser una URL válida")
    .default("http://localhost:3000"),

  /**
   * Nombre comercial de la aplicación.
   */
  NEXT_PUBLIC_APP_NAME: z
    .string()
    .trim()
    .min(1)
    .default("Credi Marketplace"),

  /**
   * Idioma predeterminado.
   */
  NEXT_PUBLIC_DEFAULT_LOCALE: z
    .string()
    .trim()
    .min(2)
    .max(10)
    .default("es"),

  /**
   * Moneda predeterminada.
   */
  NEXT_PUBLIC_DEFAULT_CURRENCY: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .default("USD"),

  /**
   * País predeterminado.
   */
  NEXT_PUBLIC_DEFAULT_COUNTRY: z
    .string()
    .trim()
    .length(2)
    .transform((value) => value.toUpperCase())
    .default("VE"),

  /**
   * Entorno lógico de la aplicación.
   */
  NEXT_PUBLIC_ENV: z
    .enum([
      "development",
      "staging",
      "production",
    ])
    .default("development"),
});

/* ==========================================================
   VALIDATION
   ========================================================== */

const serverEnv = serverEnvSchema.parse({
  SUPABASE_SECRET_KEY:
    process.env.SUPABASE_SECRET_KEY,

  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY,

  DATABASE_URL:
    process.env.DATABASE_URL,

  GEMINI_API_KEY:
    process.env.GEMINI_API_KEY,
});

const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL,

  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,

  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL,

  NEXT_PUBLIC_APP_NAME:
    process.env.NEXT_PUBLIC_APP_NAME,

  NEXT_PUBLIC_DEFAULT_LOCALE:
    process.env.NEXT_PUBLIC_DEFAULT_LOCALE,

  NEXT_PUBLIC_DEFAULT_CURRENCY:
    process.env.NEXT_PUBLIC_DEFAULT_CURRENCY,

  NEXT_PUBLIC_DEFAULT_COUNTRY:
    process.env.NEXT_PUBLIC_DEFAULT_COUNTRY,

  NEXT_PUBLIC_ENV:
    process.env.NEXT_PUBLIC_ENV,
});

/* ==========================================================
   PUBLIC API
   ========================================================== */

export const env = {
  ...serverEnv,
  ...publicEnv,
} as const;

/* ==========================================================
   TYPES
   ========================================================== */

export type Env = typeof env;
