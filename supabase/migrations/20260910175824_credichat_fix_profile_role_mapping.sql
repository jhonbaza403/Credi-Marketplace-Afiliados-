create or replace function public.sync_credi_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_role text;
  requested_role text;
  normalized_phone text;
  display_name text;
begin
  requested_role := lower(coalesce(new.raw_user_meta_data->>'requested_role', 'customer'));
  profile_role := case when requested_role in ('vendor','customer','professional','company','admin') then requested_role else 'customer' end;
  normalized_phone := public.normalize_credi_phone(new.raw_user_meta_data->>'phone_e164');
  display_name := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');

  insert into public.profiles (id, email, full_name, role, phone, is_active, created_at, updated_at)
  values (new.id, new.email, display_name, profile_role::public.user_role, normalized_phone, true, coalesce(new.created_at, now()), now())
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    role = case when public.profiles.role::text = 'admin' then public.profiles.role else excluded.role end,
    phone = coalesce(excluded.phone, public.profiles.phone),
    is_active = true,
    updated_at = now();
  update public.profiles set phone_e164 = coalesce(normalized_phone, phone_e164) where id = new.id;
  return new;
end;
$$;
