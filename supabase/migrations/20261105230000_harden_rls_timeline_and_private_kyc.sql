-- Forward-only hardening shared by Preview and Production.
-- Removes permissive-policy overlaps, closes anonymous execution of the admin
-- operations timeline, and routes new KYC evidence to private Storage.
-- No existing business rows or Storage objects are deleted or copied.

-- The old permissive SELECT policies do not require moderation_status='approved'.
-- PostgreSQL combines permissive policies with OR, so these policies bypass the
-- newer moderation-aware policies while both exist.
drop policy if exists advertisements_select_active_or_own on public.advertisements;
drop policy if exists feed_posts_select_public_or_own on public.feed_posts;
drop policy if exists reels_select_public_or_own on public.reels;

-- The operation timeline contains payment, wallet, settlement and identity-adjacent
-- operational metadata. The route requires an authenticated platform admin.
-- Keep that route contract; remove PUBLIC/anon execution and pin search_path.
alter function public.get_credi_operation_timeline(uuid) set search_path = '';
revoke all on function public.get_credi_operation_timeline(uuid) from public, anon;
grant execute on function public.get_credi_operation_timeline(uuid) to authenticated, service_role;

-- Production already has this private bucket. Preview receives the same bucket
-- contract. Fail closed if an existing bucket has unsafe or incompatible settings.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kyc-documents',
  'kyc-documents',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','application/pdf']::text[]
)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'kyc-documents'
      and public = false
      and file_size_limit = 10485760
      and allowed_mime_types @> array['image/jpeg','image/png','image/webp','application/pdf']::text[]
  ) then
    raise exception 'KYC_PRIVATE_BUCKET_CONFIGURATION_MISMATCH';
  end if;
end;
$$;

-- Store new KYC evidence only in the private kyc-documents bucket.
-- PDF is accepted only for the front/back identity document; profile photos
-- remain raster images. Every path must be rooted under auth.uid().
create or replace function private.submit_kyc_identity(
  p_country text,
  p_document_type text,
  p_document_number text,
  p_documents jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  u uuid := (select auth.uid());
  case_id uuid;
  req text[] := array['id_front','id_back','profile_photo','left_photo','right_photo'];
  typ text;
  path text;
  mime text;
  sz bigint;
  rl record;
  x jsonb;
  meta jsonb;
  cnt int;
  v_case public.kyc_cases;
begin
  if u is null then
    raise exception 'UNAUTHORIZED' using errcode='42501';
  end if;

  select * into rl from public.consume_api_rate_limit('kyc_submit:'||u::text,3,3600);
  if not rl.allowed then raise exception 'RATE_LIMITED' using errcode='42900'; end if;

  if p_country is null or upper(trim(p_country)) !~ '^[A-Z]{2}$' then
    raise exception 'INVALID_COUNTRY';
  end if;
  if p_document_type not in ('id_card','passport','drivers_license') then
    raise exception 'INVALID_DOCUMENT_TYPE';
  end if;
  if p_document_number is null or char_length(trim(p_document_number)) < 3
     or char_length(trim(p_document_number)) > 80 then
    raise exception 'INVALID_DOCUMENT_NUMBER';
  end if;
  if p_documents is null or jsonb_typeof(p_documents) is distinct from 'array'
     or jsonb_array_length(p_documents) <> 5 then
    raise exception 'INVALID_DOCUMENTS';
  end if;

  select * into v_case
  from public.kyc_cases
  where user_id = u
  order by created_at desc, id desc
  limit 1
  for update;

  if found and v_case.status in ('approved','under_review','submitted') then
    raise exception 'KYC_CASE_ALREADY_IN_REVIEW';
  end if;

  foreach typ in array req loop
    select count(*) into cnt
    from jsonb_array_elements(p_documents) as item(value)
    where item.value->>'type' = typ;
    if cnt <> 1 then raise exception 'DUPLICATE_OR_MISSING_KYC_FILE'; end if;
  end loop;

  for x in select value from jsonb_array_elements(p_documents) loop
    typ := x->>'type';
    if typ is null or not (typ = any(req)) then
      raise exception 'INVALID_KYC_FILE_TYPE';
    end if;

    path := trim(coalesce(x->>'path',''));
    if char_length(path) < 1 or char_length(path) > 512
       or position('..' in path) > 0
       or left(path,1) = '/'
       or left(path,char_length(u::text)+1) <> u::text || '/' then
      raise exception 'INVALID_KYC_FILE_PATH';
    end if;

    select so.metadata into meta
    from storage.objects so
    where so.bucket_id = 'kyc-documents'
      and so.name = path
      and (so.owner_id = u::text or so.owner = u)
      and coalesce(so.is_delete_marker,false) = false
    limit 1;

    if meta is null then raise exception 'REQUIRED_KYC_FILE_MISSING_OR_NOT_OWNED'; end if;

    mime := lower(coalesce(meta->>'mimetype',meta->>'mime_type',''));
    if typ in ('id_front','id_back') then
      if mime not in ('image/jpeg','image/png','image/webp','application/pdf') then
        raise exception 'INVALID_KYC_FILE';
      end if;
    elsif mime not in ('image/jpeg','image/png','image/webp') then
      raise exception 'INVALID_KYC_FILE';
    end if;

    sz := nullif(meta->>'size','')::bigint;
    if sz is null or sz < 1 or sz > 10485760 then
      raise exception 'INVALID_KYC_FILE';
    end if;
    if coalesce(x->>'mime_type','') <> '' and lower(trim(x->>'mime_type')) <> mime then
      raise exception 'KYC_MIME_MISMATCH';
    end if;
    if coalesce(x->>'size_bytes','') <> '' and trim(x->>'size_bytes') <> (meta->>'size') then
      raise exception 'KYC_SIZE_MISMATCH';
    end if;
  end loop;

  if v_case.id is null or v_case.status in ('rejected','expired') then
    insert into public.kyc_cases(user_id,status,country,document_type,document_number,submitted_at)
    values(u,'submitted',upper(trim(p_country)),p_document_type,trim(p_document_number),now())
    returning id into case_id;
  else
    case_id := v_case.id;
    update public.kyc_cases
    set status='submitted', country=upper(trim(p_country)), document_type=p_document_type,
        document_number=trim(p_document_number), submitted_at=now(), updated_at=now(),
        rejection_reason=null
    where id=case_id and user_id=u;
    delete from public.kyc_documents where kyc_documents.case_id=case_id;
  end if;

  for x in select value from jsonb_array_elements(p_documents) loop
    typ := x->>'type';
    path := trim(x->>'path');
    select so.metadata into meta
    from storage.objects so
    where so.bucket_id='kyc-documents'
      and so.name=path
      and (so.owner_id=u::text or so.owner=u)
      and coalesce(so.is_delete_marker,false)=false
    limit 1;
    mime := lower(coalesce(meta->>'mimetype',meta->>'mime_type',''));
    sz := (meta->>'size')::bigint;
    insert into public.kyc_documents(case_id,document_type,storage_path,mime_type,size_bytes)
    values(case_id,typ,path,mime,sz);
  end loop;

  return case_id;
end;
$function$;
