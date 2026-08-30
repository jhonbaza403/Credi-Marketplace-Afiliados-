-- ============================================================
-- Credi Marketplace
-- MIGRATION 001: PostgreSQL Extensions
-- PostgreSQL / Supabase
-- ============================================================

BEGIN;

-- UUIDs seguros y compatibles con PostgreSQL/Supabase.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Funciones criptográficas adicionales.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

COMMIT;