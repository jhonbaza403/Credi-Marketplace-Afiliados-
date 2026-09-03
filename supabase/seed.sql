```sql
-- ============================================================
-- CREDI MARKETPLACE
-- SUPABASE SEED
-- Datos iniciales deterministas para desarrollo / staging
-- ============================================================
--
-- CONTRATO DEL SEED
-- ------------------------------------------------------------
-- 1. Este archivo debe ser SQL puro y ejecutable por Supabase CLI.
-- 2. No contiene secretos, contraseñas, API keys ni credenciales.
-- 3. No crea usuarios, perfiles ni datos de producción.
-- 4. Las migraciones son la única fuente de cambios de esquema.
-- 5. El seed utiliza UUID canónicos para ser reproducible.
-- 6. Está pensado para entornos locales y staging controlado.
--
-- Las extensiones y el esquema se crean en las migraciones.
-- Por eso este archivo no crea extensiones ni objetos de esquema.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CATEGORÍAS RAÍZ
-- ============================================================

INSERT INTO public.categories (
  id,
  parent_id,
  name,
  slug,
  is_active
)
VALUES
  ('10000000-0000-4000-8000-000000000001', NULL, 'Tecnología', 'tecnologia', TRUE),
  ('10000000-0000-4000-8000-000000000002', NULL, 'Hogar', 'hogar', TRUE),
  ('10000000-0000-4000-8000-000000000003', NULL, 'Electrónica', 'electronica', TRUE),
  ('10000000-0000-4000-8000-000000000004', NULL, 'Servicios Profesionales', 'servicios-profesionales', TRUE),
  ('10000000-0000-4000-8000-000000000005', NULL, 'Empleo', 'empleo', TRUE),
  ('10000000-0000-4000-8000-000000000006', NULL, 'Mayoristas B2B', 'mayoristas-b2b', TRUE)
ON CONFLICT (id) DO UPDATE
SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  is_active = EXCLUDED.is_active;

-- ============================================================
-- 2. SUBCATEGORÍAS DE TECNOLOGÍA
-- ============================================================

INSERT INTO public.categories (
  id,
  parent_id,
  name,
  slug,
  is_active
)
VALUES
  ('10000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', 'Computación', 'computacion', TRUE),
  ('10000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', 'Celulares', 'celulares', TRUE),
  ('10000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001', 'Accesorios', 'accesorios', TRUE)
ON CONFLICT (id) DO UPDATE
SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  is_active = EXCLUDED.is_active;

-- ============================================================
-- 3. USUARIOS / PERFILES
-- ============================================================
--
-- No se crean usuarios, perfiles ni credenciales ficticias.
-- profiles.id depende de auth.users(id). Los fixtures de usuarios
-- deben generarse mediante Auth o mediante tests controlados.
--
-- ============================================================

-- ============================================================
-- 4. STORES / PRODUCTS / AFFILIATES
-- ============================================================
--
-- No se insertan aquí entidades que dependan de propietarios,
-- cuentas de autenticación o relaciones transaccionales.
-- Esto evita registros huérfanos y mantiene el seed base pequeño,
-- determinista y seguro.
--
-- Los escenarios complejos deben implementarse como fixtures
-- específicos de integración o pruebas automatizadas.
--
-- ============================================================

-- ============================================================
-- 5. VERIFICACIÓN DE INTEGRIDAD
-- ============================================================

DO $$
DECLARE
  root_count INTEGER;
  child_count INTEGER;
  invalid_child_links INTEGER;
  inactive_seed_categories INTEGER;
BEGIN
  -- ----------------------------------------------------------
  -- 5.1. Categorías raíz obligatorias
  -- ----------------------------------------------------------

  SELECT COUNT(*)
    INTO root_count
    FROM public.categories
   WHERE id IN (
     '10000000-0000-4000-8000-000000000001',
     '10000000-0000-4000-8000-000000000002',
     '10000000-0000-4000-8000-000000000003',
     '10000000-0000-4000-8000-000000000004',
     '10000000-0000-4000-8000-000000000005',
     '10000000-0000-4000-8000-000000000006'
   )
   AND parent_id IS NULL;

  IF root_count <> 6 THEN
    RAISE EXCEPTION
      'Seed inválido: se esperaban 6 categorías raíz y se encontraron %.',
      root_count;
  END IF;

  -- ----------------------------------------------------------
  -- 5.2. Subcategorías obligatorias
  -- ----------------------------------------------------------

  SELECT COUNT(*)
    INTO child_count
    FROM public.categories
   WHERE id IN (
     '10000000-0000-4000-8000-000000000011',
     '10000000-0000-4000-8000-000000000012',
     '10000000-0000-4000-8000-000000000013'
   );

  IF child_count <> 3 THEN
    RAISE EXCEPTION
      'Seed inválido: se esperaban 3 subcategorías y se encontraron %.',
      child_count;
  END IF;

  -- ----------------------------------------------------------
  -- 5.3. Relación padre-hijo
  -- ----------------------------------------------------------

  SELECT COUNT(*)
    INTO invalid_child_links
    FROM public.categories
   WHERE (id = '10000000-0000-4000-8000-000000000011'
          AND parent_id IS DISTINCT FROM '10000000-0000-4000-8000-000000000001')
      OR (id = '10000000-0000-4000-8000-000000000012'
          AND parent_id IS DISTINCT FROM '10000000-0000-4000-8000-000000000001')
      OR (id = '10000000-0000-4000-8000-000000000013'
          AND parent_id IS DISTINCT FROM '10000000-0000-4000-8000-000000000001');

  IF invalid_child_links <> 0 THEN
    RAISE EXCEPTION
      'Seed inválido: una o más subcategorías tienen un parent_id incorrecto.';
  END IF;

  -- ----------------------------------------------------------
  -- 5.4. Todas las categorías del seed deben estar activas
  -- ----------------------------------------------------------

  SELECT COUNT(*)
    INTO inactive_seed_categories
    FROM public.categories
   WHERE id IN (
     '10000000-0000-4000-8000-000000000001',
     '10000000-0000-4000-8000-000000000002',
     '10000000-0000-4000-8000-000000000003',
     '10000000-0000-4000-8000-000000000004',
     '10000000-0000-4000-8000-000000000005',
     '10000000-0000-4000-8000-000000000006',
     '10000000-0000-4000-8000-000000000011',
     '10000000-0000-4000-8000-000000000012',
     '10000000-0000-4000-8000-000000000013'
   )
   AND is_active IS DISTINCT FROM TRUE;

  IF inactive_seed_categories <> 0 THEN
    RAISE EXCEPTION
      'Seed inválido: se encontraron % categorías base inactivas.',
      inactive_seed_categories;
  END IF;
END
$$;

COMMIT;

-- ============================================================
-- FIN seed.sql
-- ============================================================
```
