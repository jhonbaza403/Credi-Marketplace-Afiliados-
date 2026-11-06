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
  v_case_id uuid;
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
    returning id into v_case_id;
  else
    v_case_id := v_case.id;
    update public.kyc_cases
    set status='submitted', country=upper(trim(p_country)), document_type=p_document_type,
        document_number=trim(p_document_number), submitted_at=now(), updated_at=now(),
        rejection_reason=null
    where id=v_case_id and user_id=u;
    delete from public.kyc_documents where kyc_documents.case_id=v_case_id;
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
    values(v_case_id,typ,path,mime,sz);
  end loop;

  return v_case_id;
end;
$function$;


-- Preserve the production behavior of recording both order creation and status
-- transitions, while writing to the actual shared order_status_history schema.
-- The previous Production function referenced old_status/new_status/changed_at,
-- columns that do not exist in either environment's table definition.
create or replace function public.record_order_status_change()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (
      order_id, from_status, to_status, changed_by, reason, metadata
    )
    values (
      new.id,
      null,
      new.status::text,
      auth.uid(),
      'Order created',
      jsonb_build_object('source','trg_orders_status_history')
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.order_status_history (
      order_id, from_status, to_status, changed_by, reason, metadata
    )
    values (
      new.id,
      old.status::text,
      new.status::text,
      auth.uid(),
      'Order status changed',
      jsonb_build_object('source','trg_orders_status_history')
    );
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_orders_status_history on public.orders;
create trigger trg_orders_status_history
after insert or update of status on public.orders
for each row execute function public.record_order_status_change();


-- The public RPC is the authenticated entry point. Its previous INVOKER wrapper
-- could not call the private implementation because authenticated has no EXECUTE
-- on private.submit_kyc_identity. Run the wrapper as its trusted owner while the
-- private implementation continues to enforce auth.uid(), rate limits and file ownership.
create or replace function public.submit_kyc_identity(
  p_country text,
  p_document_type text,
  p_document_number text,
  p_documents jsonb
)
returns uuid
language sql
security definer
set search_path = ''
as $function$
  select private.submit_kyc_identity($1,$2,$3,$4);
$function$;

revoke all on function public.submit_kyc_identity(text,text,text,jsonb) from public, anon;
grant execute on function public.submit_kyc_identity(text,text,text,jsonb) to authenticated, service_role;


-- Public RPC wrappers must be able to invoke their private SECURITY DEFINER
-- implementations. Keep private EXECUTE grants closed; elevate only the reviewed
-- public entry points. Their implementations independently enforce auth.uid(),
-- ownership/party checks, rate limits and (for refunds) platform-owner authority.
do $$
declare
  sig text;
  signatures text[] := array[
    'public.accept_negotiation(uuid,uuid)',
    'public.create_b2b_award(uuid,uuid,uuid,uuid)',
    'public.create_credichat_direct_conversation(uuid,uuid,uuid,uuid,uuid,text,jsonb)',
    'public.get_credi_contact_by_pin(text)',
    'public.get_credi_contact(text)',
    'public.get_transaction_rating_targets(uuid)',
    'public.initialize_order_tax_transaction(uuid)',
    'public.submit_kyc_identity(text,text,text,jsonb)',
    'public.submit_transaction_rating(uuid,uuid,smallint,text,jsonb)',
    'public.wallet_pay_order(uuid,text)',
    'public.wallet_refund_order(uuid,numeric,text,text)',
    'public.wallet_transfer(uuid,numeric,text,text)'
  ];
begin
  foreach sig in array signatures loop
    if to_regprocedure(sig) is null then
      raise exception 'EXPECTED_PUBLIC_RPC_MISSING: %', sig;
    end if;
    execute format('alter function %s security definer', to_regprocedure(sig));
    execute format('alter function %s set search_path = %L', to_regprocedure(sig), '');
    execute format('revoke all on function %s from public, anon', to_regprocedure(sig));
    execute format('grant execute on function %s to authenticated, service_role', to_regprocedure(sig));
  end loop;
end;
$$;

-- Trigger-only functions do not need direct RPC EXECUTE grants. Production already
-- keeps these closed; align Preview without changing their trigger attachments.
revoke all on function public.create_affiliate_commission_ledger_entry() from public, anon, authenticated;
alter function public.prevent_affiliate_self_referral() security definer;
alter function public.prevent_affiliate_self_referral() set search_path = '';
revoke all on function public.prevent_affiliate_self_referral() from public, anon, authenticated;

-- Keep plan access self-scoped. Platform-owner/admin access is evaluated separately
-- from commercial entitlements; do not expose another user's admin status through
-- the plan-feature RPC. Service-role backend calls may explicitly request a user.
create or replace function public.current_user_plan(p_user_id uuid default auth.uid())
returns table(plan_id uuid, plan_code text, plan_name text, status text, billing_interval text, limits jsonb)
language sql
stable
security invoker
set search_path = ''
as $function$
with effective as (
  select p.id, p.code, p.name, s.status, s.billing_interval, p.limits, s.created_at
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = p_user_id
    and p_user_id is not null
    and (p_user_id = (select auth.uid()) or (select auth.role()) = 'service_role')
    and s.status in ('trialing','active')
    and (
      s.status = 'trialing'
      or s.cancel_at_period_end = false
      or s.current_period_end is null
      or s.current_period_end > now()
    )
  order by s.created_at desc
  limit 1
)
select id, code, name, status, billing_interval, limits from effective
union all
select p.id, p.code, p.name, 'active'::text, 'free'::text, p.limits
from public.plans p
where p.code = 'free'
  and p.is_active = true
  and p_user_id is not null
  and (p_user_id = (select auth.uid()) or (select auth.role()) = 'service_role')
  and not exists (select 1 from effective)
limit 1;
$function$;

create or replace function public.get_user_entitlement(
  p_feature_key text,
  p_user_id uuid default auth.uid()
)
returns table(enabled boolean, quota bigint, plan_code text)
language sql
stable
security invoker
set search_path = ''
as $function$
  select pf.enabled, pf.quota, c.plan_code
  from public.current_user_plan(p_user_id) c
  join public.plan_features pf on pf.plan_id = c.plan_id
  where pf.feature_key = p_feature_key
  limit 1;
$function$;

create or replace function public.user_has_plan_feature(
  p_feature_key text,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select exists (
    select 1
    from public.get_user_entitlement(p_feature_key, p_user_id) e
    where e.enabled = true
  );
$function$;

revoke all on function public.current_user_plan(uuid) from public, anon;
revoke all on function public.get_user_entitlement(text,uuid) from public, anon;
revoke all on function public.user_has_plan_feature(text,uuid) from public, anon;
grant execute on function public.current_user_plan(uuid) to authenticated, service_role;
grant execute on function public.get_user_entitlement(text,uuid) to authenticated, service_role;
grant execute on function public.user_has_plan_feature(text,uuid) to authenticated, service_role;

-- Affiliate click tracking is intentionally service-role-only; the API route
-- validates an active link and performs the counter update through its admin client.
alter function public.record_affiliate_product_click(uuid) set search_path = '';
revoke all on function public.record_affiliate_product_click(uuid) from public, anon, authenticated;
grant execute on function public.record_affiliate_product_click(uuid) to service_role;
