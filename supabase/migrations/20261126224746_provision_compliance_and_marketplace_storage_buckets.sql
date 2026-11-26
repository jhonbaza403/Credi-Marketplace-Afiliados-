-- Provision the Storage buckets required by compliance and marketplace uploads.
-- Existing bucket rows are never updated or deleted. If an existing bucket has a
-- different security/size/MIME contract, abort instead of silently changing it.
--
-- KYC/KYB documents remain private and are accessed through server-side
-- service-role operations and short-lived signed download URLs.
-- Marketplace media remains public for published catalog/social assets; upload
-- authorization is issued by the media-upload Edge Function.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'marketplace-media',
    'marketplace-media',
    true,
    524288000,
    array[
      'image/jpeg','image/png','image/webp','image/gif',
      'video/mp4','video/webm','video/quicktime',
      'audio/aac','audio/flac','audio/m4a','audio/mp4','audio/mpeg',
      'audio/ogg','audio/opus','audio/webm','audio/wav','audio/x-m4a','audio/x-wav'
    ]
  ),
  (
    'kyc-documents',
    'kyc-documents',
    false,
    10485760,
    array['image/jpeg','image/png','image/webp','application/pdf']
  ),
  (
    'kyb-documents',
    'kyb-documents',
    false,
    10485760,
    array['image/jpeg','image/png','image/webp','application/pdf']
  )
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from storage.buckets
    where id = 'marketplace-media'
      and name = 'marketplace-media'
      and public = true
      and file_size_limit = 524288000
      and allowed_mime_types @> array[
        'image/jpeg','image/png','image/webp','image/gif',
        'video/mp4','video/webm','video/quicktime',
        'audio/aac','audio/flac','audio/m4a','audio/mp4','audio/mpeg',
        'audio/ogg','audio/opus','audio/webm','audio/wav','audio/x-m4a','audio/x-wav'
      ]
      and allowed_mime_types <@ array[
        'image/jpeg','image/png','image/webp','image/gif',
        'video/mp4','video/webm','video/quicktime',
        'audio/aac','audio/flac','audio/m4a','audio/mp4','audio/mpeg',
        'audio/ogg','audio/opus','audio/webm','audio/wav','audio/x-m4a','audio/x-wav'
      ]
  ) then
    raise exception 'STORAGE_BUCKET_CONFIGURATION_MISMATCH: marketplace-media';
  end if;

  if not exists (
    select 1 from storage.buckets
    where id = 'kyc-documents'
      and name = 'kyc-documents'
      and public = false
      and file_size_limit = 10485760
      and allowed_mime_types @> array['image/jpeg','image/png','image/webp','application/pdf']
      and allowed_mime_types <@ array['image/jpeg','image/png','image/webp','application/pdf']
  ) then
    raise exception 'STORAGE_BUCKET_CONFIGURATION_MISMATCH: kyc-documents';
  end if;

  if not exists (
    select 1 from storage.buckets
    where id = 'kyb-documents'
      and name = 'kyb-documents'
      and public = false
      and file_size_limit = 10485760
      and allowed_mime_types @> array['image/jpeg','image/png','image/webp','application/pdf']
      and allowed_mime_types <@ array['image/jpeg','image/png','image/webp','application/pdf']
  ) then
    raise exception 'STORAGE_BUCKET_CONFIGURATION_MISMATCH: kyb-documents';
  end if;
end;
$$;
