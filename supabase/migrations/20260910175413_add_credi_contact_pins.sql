create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists credi_pin text;

create unique index if not exists profiles_credi_pin_unique
  on public.profiles (credi_pin)
  where credi_pin is not null;

create or replace function public.generate_credi_pin()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  candidate text;
begin
  loop
    candidate := 'CRD-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 10));
    exit when not exists (select 1 from public.profiles where credi_pin = candidate);
  end loop;
  return candidate;
end;
$$;

revoke execute on function public.generate_credi_pin() from public, anon, authenticated;
grant execute on function public.generate_credi_pin() to authenticated;

create or replace function public.get_credi_contact_by_pin(p_credi_pin text)
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  role text,
  is_active boolean,
  store_name text,
  is_verified boolean
)
language sql
stable
security definer
set search_path = ''
as $$
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
  where p.credi_pin = upper(trim(p_credi_pin))
    and p.is_active = true
  limit 1;
$$;

revoke execute on function public.get_credi_contact_by_pin(text) from public, anon;
grant execute on function public.get_credi_contact_by_pin(text) to authenticated;

create or replace function public.ensure_my_credi_pin()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  existing text;
  candidate text;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select credi_pin into existing
  from public.profiles
  where id = auth.uid();

  if existing is not null then
    return existing;
  end if;

  candidate := public.generate_credi_pin();
  update public.profiles set credi_pin = candidate, updated_at = now() where id = auth.uid();
  return candidate;
end;
$$;

revoke execute on function public.ensure_my_credi_pin() from public, anon;
grant execute on function public.ensure_my_credi_pin() to authenticated;
