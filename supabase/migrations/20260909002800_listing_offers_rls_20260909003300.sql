-- Historical migration version retained for remote history compatibility.
-- The local repository previously omitted the canonical creation DDL for
-- public.listing_offers, while this migration attempted to create policies
-- against that table before it existed during a clean reset.
--
-- The complete table, constraints, indexes, grants, trigger and RLS policies
-- are now restored from the read-only production catalog snapshot by:
--   20261104020000_restore_listing_offers_schema.sql
--
-- Keep this version as an intentional no-op. Do not recreate a partial table
-- here or add client access without the canonical migration.
BEGIN;
COMMIT;
