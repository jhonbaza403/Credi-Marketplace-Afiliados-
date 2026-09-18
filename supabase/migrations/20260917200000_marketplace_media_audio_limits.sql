-- Marketplace media hardening: allow audio and cap uploaded media at 500 MB.
-- The bucket remains private/public according to the existing policy; this migration
-- only aligns MIME allow-list and documents the application-level size contract.
update storage.buckets
set
  file_size_limit = 524288000,
  allowed_mime_types = array[
    'image/jpeg','image/png','image/webp','image/gif',
    'video/mp4','video/webm','video/quicktime',
    'audio/aac','audio/flac','audio/m4a','audio/mp4','audio/mpeg',
    'audio/ogg','audio/opus','audio/webm','audio/wav','audio/x-m4a','audio/x-wav'
  ]
where id = 'marketplace-media';
