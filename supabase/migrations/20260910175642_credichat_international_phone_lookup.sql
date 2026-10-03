alter table public.profiles add column if not exists phone_e164 text;

create unique index if not exists profiles_phone_e164_unique_idx on public.profiles (phone_e164) where phone_e164 is not null;

create or replace function public.normalize_credi_phone(p_phone text)
returns text
language plpgsql
immutable
as $$
declare
  digits text;
begin
  if p_phone is null then return null; end if;
  digits := regexp_replace(trim(p_phone), '[^0-9+]', '', 'g');
  if digits = '' then return null; end if;
  if left(digits, 1) <> '+' then
    digits := '+' || digits;
  end if;
  if digits !~ '^\+[1-9][0-9]{6,14}$' then return null; end if;
  return digits;
end;
$$;

create or replace function public.get_credi_contact(p_identifier text)
returns table(id uuid, full_name text, avatar_url text, role text, is_active boolean, store_name text, is_verified boolean)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  normalized text;
begin
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
$$;

revoke all on function public.normalize_credi_phone(text) from public;
grant execute on function public.normalize_credi_phone(text) to authenticated;
revoke all on function public.get_credi_contact(text) from public;
grant execute on function public.get_credi_contact(text) to authenticated;
