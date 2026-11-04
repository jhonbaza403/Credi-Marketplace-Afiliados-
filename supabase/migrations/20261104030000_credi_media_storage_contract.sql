-- Credi media storage contract: public commerce media and private chat uploads.
-- Safe to reapply; preserves the private visibility of credichat-private.
BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketplace-media',
  'marketplace-media',
  true,
  524288000,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/aac', 'audio/flac', 'audio/m4a', 'audio/mp4', 'audio/mpeg',
    'audio/ogg', 'audio/opus', 'audio/webm', 'audio/wav', 'audio/x-m4a', 'audio/x-wav'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'credichat-private',
  'credichat-private',
  false,
  524288000,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/aac', 'audio/flac', 'audio/m4a', 'audio/mp4', 'audio/mpeg',
    'audio/ogg', 'audio/opus', 'audio/webm', 'audio/wav', 'audio/x-m4a', 'audio/x-wav',
    'application/pdf'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMENT ON TABLE storage.buckets IS
  'Supabase Storage buckets. Credi uses marketplace-media for public commerce media and credichat-private for private chat attachments.';

COMMIT;
