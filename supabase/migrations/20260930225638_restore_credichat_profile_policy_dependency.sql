-- Historical ordering fix:
-- The private helper is created and granted in the later
-- 20261104040500_restore_missing_preview_private_helpers migration.
-- Do not grant a function before its definition exists in a clean rebuild.
BEGIN;
COMMIT;
