
create or replace function public.get_credi_contact(p_identifier text)
returns table(id uuid, full_name text, avatar_url text, role text, is_active boolean, store_name text, is_verified boolean)
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  normalized text;
begin
  if (select auth.uid()) is null then
    raise exception 'UNAUTHORIZED' using errcode='42501';
  end if;
  normalized := upper(trim(coalesce(p_identifier, '')));
  if normalized = '' then return; end if;
  if normalized like 'CRD-%' then
    return query
      select p.id, p.full_name, p.avatar_url, p.role::text, p.is_active, s.store_name, s.is_verified
      from public.profiles p
      left join public.stores s on s.vendor_id = p.id and s.is_active = true
      where p.credi_pin = normalized and p.is_active = true
      limit 1;
  end if;
  normalized := public.normalize_credi_phone(p_identifier);
  if normalized is null then return; end if;
  return query
    select p.id, p.full_name, p.avatar_url, p.role::text, p.is_active, s.store_name, s.is_verified
    from public.profiles p
    left join public.stores s on s.vendor_id = p.id and s.is_active = true
    where p.phone_e164 = normalized and p.is_active = true
    limit 1;
end;
$function$;

create or replace function public.get_credi_contact_by_pin(p_credi_pin text)
returns table(id uuid, full_name text, avatar_url text, role text, is_active boolean, store_name text, is_verified boolean)
language sql
stable security definer
set search_path to ''
as $function$
  select
    p.id,
    p.full_name,
    p.avatar_url,
    p.role::text,
    p.is_active,
    s.store_name,
    s.is_verified
  from public.profiles p
  left join lateral (
    select st.store_name, st.is_verified
    from public.stores st
    where st.vendor_id = p.id and st.is_active = true
    order by st.is_verified desc, st.created_at asc
    limit 1
  ) s on true
  where (select auth.uid()) is not null
    and p.credi_pin = upper(trim(p_credi_pin))
    and p.is_active = true
  limit 1;
$function$;
