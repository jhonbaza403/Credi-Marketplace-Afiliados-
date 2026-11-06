-- Restore the private KYC profile-photo table that exists in Production.
-- This schema was historically maintained in supabase/legacy-migrations and is
-- required by credi_account_security_status() and its RLS hardening migration.
-- No identity rows or objects are copied from Production.

CREATE TABLE IF NOT EXISTS public.profile_verification_photos (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  front_path text,
  left_path text,
  right_path text,
  status text NOT NULL DEFAULT 'not_submitted'
    CHECK (status IN ('not_submitted','submitted','approved','rejected')),
  rejection_reason text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    status = 'not_submitted'
    OR (front_path IS NOT NULL AND left_path IS NOT NULL AND right_path IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS profile_verification_photos_status_idx
  ON public.profile_verification_photos(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_verification_photos_reviewed_by
  ON public.profile_verification_photos(reviewed_by);

DROP TRIGGER IF EXISTS profile_verification_photos_updated_at
  ON public.profile_verification_photos;
CREATE TRIGGER profile_verification_photos_updated_at
BEFORE UPDATE ON public.profile_verification_photos
FOR EACH ROW EXECUTE FUNCTION public.set_compliance_updated_at();

ALTER TABLE public.profile_verification_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_verification_photos_owner_select
  ON public.profile_verification_photos;
DROP POLICY IF EXISTS profile_verification_photos_admin_select
  ON public.profile_verification_photos;
DROP POLICY IF EXISTS profile_verification_photos_select_authorized
  ON public.profile_verification_photos;
CREATE POLICY profile_verification_photos_select_authorized
ON public.profile_verification_photos FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

REVOKE ALL ON public.profile_verification_photos FROM anon, authenticated;
GRANT SELECT ON public.profile_verification_photos TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'identity-profile-private',
  'identity-profile-private',
  false,
  15728640,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 15728640,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];
