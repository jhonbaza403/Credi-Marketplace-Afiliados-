-- ============================================================
-- CREDI MARKETPLACE
-- SUPABASE SEED
-- Datos iniciales de desarrollo / staging
-- ============================================================
--
-- IMPORTANTE:
-- Este archivo se ejecuta como SQL puro.
-- No insertar secretos, contraseñas, API keys ni credenciales.
-- No crear usuarios de producción desde el seed.
--
-- Diseñado para entornos locales/controlados.
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. CATEGORÍAS BASE
-- ============================================================

INSERT INTO categories (id, name, slug, parent_id)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'Tecnología', 'tecnologia', NULL),
  ('10000000-0000-4000-8000-000000000002', 'Hogar', 'hogar', NULL),
  ('10000000-0000-4000-8000-000000000003', 'Electrónica', 'electronica', NULL),
  ('10000000-0000-4000-8000-000000000004', 'Servicios Profesionales', 'servicios-profesionales', NULL),
  ('10000000-0000-4000-8000-000000000005', 'Empleo', 'empleo', NULL),
  ('10000000-0000-4000-8000-000000000006', 'Mayoristas B2B', 'mayoristas-b2b', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. SUBCATEGORÍAS
-- ============================================================

INSERT INTO categories (id, name, slug, parent_id)
VALUES
  ('10000000-0000-4000-8000-000000000011', 'Computación', 'computacion', '10000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000012', 'Celulares', 'celulares', '10000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000013', 'Accesorios', 'accesorios', '10000000-0000-4000-8000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. DATOS DE USUARIO
-- ============================================================
--
-- No se crean usuarios, perfiles ni credenciales ficticias.
-- Los datos dependientes de auth.users deben generarse mediante
-- el flujo de autenticación o fixtures de integración controlados.
--
-- ============================================================

-- ============================================================
-- 4. PRODUCTOS / STORES
-- ============================================================
--
-- No se insertan productos ni stores aquí porque requieren claves
-- de propietario válidas y podrían crear datos huérfanos.
--
-- ============================================================

-- ============================================================
-- 5. VERIFICACIÓN DE INTEGRIDAD DEL SEED
-- ============================================================

DO $$
DECLARE
  category_count INTEGER;
BEGIN
  SELECT COUNT(*)
    INTO category_count
    FROM categories
   WHERE id IN (
     '10000000-0000-4000-8000-000000000001',
     '10000000-0000-4000-8000-000000000002',
     '10000000-0000-4000-8000-000000000003',
     '10000000-0000-4000-8000-000000000004',
     '10000000-0000-4000-8000-000000000005',
     '10000000-0000-4000-8000-000000000006'
   );

  IF category_count <> 6 THEN
    RAISE EXCEPTION
      'Seed inválido: se esperaban 6 categorías base y se encontraron %.',
      category_count;
  END IF;
END
$$;

COMMIT;

-- ============================================================
-- FIN seed.sql
-- ============================================================
