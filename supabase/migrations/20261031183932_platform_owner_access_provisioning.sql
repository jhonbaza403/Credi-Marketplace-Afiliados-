-- Platform-owner identity is environment-specific and must be provisioned
-- through a protected database operation, not hard-coded into a public migration.
-- This migration documents that ownership is separate from commercial billing.
COMMENT ON COLUMN public.profiles.platform_owner IS
  'Internal platform ownership/access flag. Owner identity is provisioned per environment through controlled database operations; it is not a commercial plan, subscription, or plan entitlement.';
