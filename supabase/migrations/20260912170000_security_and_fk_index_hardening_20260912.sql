-- Reduce privilege confusion for public-facing views: make them obey querying user's RLS.
ALTER VIEW public.verified_b2b_products SET (security_invoker = true);
ALTER VIEW public.published_products SET (security_invoker = true);
ALTER VIEW public.published_b2b_products SET (security_invoker = true);
ALTER VIEW public.verified_businesses SET (security_invoker = true);

-- Add covering indexes for single-column foreign keys that do not already have one.
DO $$
DECLARE
  r record;
  idx_name text;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      a.attname AS column_name
    FROM pg_constraint fk
    JOIN pg_class c ON c.oid = fk.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = fk.conrelid AND a.attnum = fk.conkey[1]
    WHERE fk.contype = 'f'
      AND n.nspname = 'public'
      AND array_length(fk.conkey, 1) = 1
      AND NOT EXISTS (
        SELECT 1
        FROM pg_index i
        WHERE i.indrelid = fk.conrelid
          AND i.indisvalid
          AND i.indisready
          AND i.indnkeyatts >= 1
          AND i.indkey[0] = fk.conkey[1]
      )
  LOOP
    idx_name := left('idx_fk_' || r.table_name || '_' || r.column_name, 55);
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I.%I (%I)',
      idx_name, r.schema_name, r.table_name, r.column_name
    );
  END LOOP;
END $$;
