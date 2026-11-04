-- Legacy migration version 0251 is already present in the remote migration
-- history. Its Stripe catalog binding is preserved by the canonical,
-- timestamp-ordered migration:
--   20260910190037_stripe_live_catalog_binding.sql
--
-- That canonical migration runs after
--   20260910184140_020_commercial_plans.sql
-- creates public.plans. Keep this historical version as an intentional
-- no-op so a clean local reset does not attempt to alter a table before
-- its creation, while preserving the already-applied remote version number.
BEGIN;
COMMIT;
