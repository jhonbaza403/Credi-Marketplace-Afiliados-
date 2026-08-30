```sql
-- ============================================================
-- CREDI MARKETPLACE
-- SUPABASE SEED
-- Datos iniciales de desarrollo / staging
-- ============================================================
--
-- IMPORTANTE:
-- Este archivo NO debe utilizarse para insertar secretos,
-- contraseñas, claves API ni credenciales de producción.
--
-- Ejecutar únicamente en entornos controlados.
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. CATEGORÍAS BASE
-- ============================================================

INSERT INTO categories (
    id,
    name,
    slug,
    parent_id
)
VALUES
(
    '10000000-0000-4000-8000-000000000001',
    'Tecnología',
    'tecnologia',
    NULL
),
(
    '10000000-0000-4000-8000-000000000002',
    'Hogar',
    'hogar',
    NULL
),
(
    '10000000-0000-4000-8000-000000000003',
    'Electrónica',
    'electronica',
    NULL
),
(
    '10000000-0000-4000-8000-000000000004',
    'Servicios Profesionales',
    'servicios-profesionales',
    NULL
),
(
    '10000000-0000-4000-8000-000000000005',
    'Empleo',
    'empleo',
    NULL
),
(
    '10000000-0000-4000-8000-000000000006',
    'Mayoristas B2B',
    'mayoristas-b2b',
    NULL
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. SUBCATEGORÍAS
-- ============================================================

INSERT INTO categories (
    id,
    name,
    slug,
    parent_id
)
VALUES
(
    '10000000-0000-4000-8000-000000000011',
    'Computación',
    'computacion',
    '10000000-0000-4000-8000-000000000001'
),
(
    '10000000-0000-4000-8000-000000000012',
    'Celulares',
    'celulares',
    '10000000-0000-4000-8000-000000000001'
),
(
    '10000000-0000-4000-8000-000000000013',
    'Accesorios',
    'accesorios',
    '10000000-0000-4000-8000-000000000001'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. CONFIGURACIÓN DE NOTIFICACIONES
-- ============================================================
--
-- No se insertan usuarios ficticios.
-- Las preferencias se crean cuando un usuario real
-- se registra o mediante lógica de aplicación.
--
-- ============================================================

-- ============================================================
-- 4. CONFIGURACIÓN DEL SISTEMA
-- ============================================================
--
-- Si posteriormente se crea una tabla system_settings,
-- sus valores iniciales deben almacenarse aquí.
--
-- Ejemplo conceptual:
--
-- INSERT INTO system_settings (...)
-- VALUES (...);
--
-- No se crea una dependencia artificial en esta migración.
--
-- ============================================================

-- ============================================================
-- 5. PRODUCTOS DE DEMOSTRACIÓN
-- ============================================================
--
-- No se insertan productos porque requieren un store_id
-- perteneciente a un usuario autenticado real.
--
-- Esto evita crear datos huérfanos.
--
-- ============================================================

-- ============================================================
-- 6. VERIFICACIÓN BÁSICA
-- ============================================================

DO $$
DECLARE
    category_count INTEGER;
BEGIN

    SELECT COUNT(*)
    INTO category_count
    FROM categories;

    IF category_count < 1 THEN
        RAISE EXCEPTION
            'Seed inválido: no se pudieron crear categorías.';
    END IF;

END
$$;

COMMIT;

-- ============================================================
-- FIN seed.sql
-- ============================================================
```
