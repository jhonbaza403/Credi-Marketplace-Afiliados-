create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'credichat-private',
  'credichat-private',
  false,
  524288000,
  array[
    'image/jpeg','image/png','image/webp','image/gif',
    'video/mp4','video/webm','video/quicktime',
    'audio/mpeg','audio/mp4','audio/ogg','audio/webm','audio/wav','audio/x-wav',
    'application/pdf'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 524288000,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.message_attachments
  add column if not exists storage_bucket text not null default 'marketplace-media';

create index if not exists message_attachments_storage_bucket_idx
  on public.message_attachments(storage_bucket);

create policy "credichat private owner upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'credichat-private'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

update public.message_attachments
set storage_bucket = 'credichat-private'
where storage_path is not null
  and public_url is not null
  and public_url like '%/storage/v1/object/public/marketplace-media/%';

update public.message_attachments
set public_url = null
where storage_bucket = 'credichat-private';
