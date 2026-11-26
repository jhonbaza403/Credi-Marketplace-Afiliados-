BEGIN;

-- Narrow the eight marketing numeric columns to the same precision in both
-- environments. Abort instead of rounding or truncating if existing data does
-- not fit the production contract.
DO $precision_preflight$
DECLARE
  item record;
  violations bigint;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('marketing_ad_sets','daily_budget',20,2),
      ('marketing_campaigns','daily_budget',20,2),
      ('marketing_campaigns','lifetime_budget',20,2),
      ('marketing_conversion_events','event_value',20,8),
      ('marketing_daily_metrics','revenue',20,2),
      ('marketing_daily_metrics','spend',20,2),
      ('marketing_events','value',20,8),
      ('marketing_experiment_variants','allocation_percent',5,2)
    ) AS v(table_name,column_name,precision_value,scale_value)
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM public.%I WHERE %I IS NOT NULL AND (abs(%I) >= power(10::numeric, %s) OR %I <> round(%I, %s))',
      item.table_name,
      item.column_name,
      item.column_name,
      item.precision_value - item.scale_value,
      item.column_name,
      item.column_name,
      item.scale_value
    ) INTO violations;

    IF violations > 0 THEN
      RAISE EXCEPTION
        'MARKETING_NUMERIC_PRECISION_PREFLIGHT_FAILED: %.% has % incompatible rows for numeric(%,%)',
        item.table_name,
        item.column_name,
        violations,
        item.precision_value,
        item.scale_value;
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN %I TYPE numeric(%s,%s) USING %I::numeric(%s,%s)',
      item.table_name,
      item.column_name,
      item.precision_value,
      item.scale_value,
      item.column_name,
      item.precision_value,
      item.scale_value
    );
  END LOOP;
END
$precision_preflight$;

COMMIT;
