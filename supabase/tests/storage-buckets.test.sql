begin;

select plan(12);

select ok(
  exists (select 1 from storage.buckets where id = 'marketplace-media'),
  'marketplace-media bucket exists'
);
select ok(
  exists (select 1 from storage.buckets where id = 'kyc-documents'),
  'kyc-documents bucket exists'
);
select ok(
  exists (select 1 from storage.buckets where id = 'kyb-documents'),
  'kyb-documents bucket exists'
);

select is(
  (select public from storage.buckets where id = 'marketplace-media'),
  true,
  'marketplace-media is public for published assets'
);
select is(
  (select public from storage.buckets where id = 'kyc-documents'),
  false,
  'kyc-documents remains private'
);
select is(
  (select public from storage.buckets where id = 'kyb-documents'),
  false,
  'kyb-documents remains private'
);

select is(
  (select file_size_limit::bigint from storage.buckets where id = 'marketplace-media'),
  524288000::bigint,
  'marketplace-media enforces the 500 MiB bucket limit'
);
select is(
  (select file_size_limit::bigint from storage.buckets where id = 'kyc-documents'),
  10485760::bigint,
  'kyc-documents enforces the 10 MiB bucket limit'
);
select is(
  (select file_size_limit::bigint from storage.buckets where id = 'kyb-documents'),
  10485760::bigint,
  'kyb-documents enforces the 10 MiB bucket limit'
);

select ok(
  (select
    allowed_mime_types @> array[
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
   from storage.buckets where id = 'marketplace-media'),
  'marketplace-media allows the configured image, video and audio MIME types only'
);
select ok(
  (select
    allowed_mime_types @> array['image/jpeg','image/png','image/webp','application/pdf']
    and allowed_mime_types <@ array['image/jpeg','image/png','image/webp','application/pdf']
   from storage.buckets where id = 'kyc-documents'),
  'kyc-documents allows supported raster images and PDF only'
);
select ok(
  (select
    allowed_mime_types @> array['image/jpeg','image/png','image/webp','application/pdf']
    and allowed_mime_types <@ array['image/jpeg','image/png','image/webp','application/pdf']
   from storage.buckets where id = 'kyb-documents'),
  'kyb-documents allows supported raster images and PDF only'
);

select * from finish();
rollback;
