-- Harden self-service profile role assignment.
-- Client-controlled Auth metadata may request only customer/vendor.
-- Professional/company/admin must be granted through privileged workflows.

create or replace function public.sync_credi_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_role public.user_role;
  requested_role text;
  normalized_phone text;
  display_name text;
begin
  requested_role := lower(coalesce(new.raw_user_meta_data->>'requested_role', 'customer'));

  profile_role := case
    when requested_role in ('vendor', 'customer') then requested_role::public.user_role
    else 'customer'::public.user_role
  end;

  normalized_phone := public.normalize_credi_phone(new.raw_user_meta_data->>'phone_e164');
  display_name := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');

  insert into public.profiles (id, email, full_name, role, phone, is_active, created_at, updated_at)
  values (
    new.id,
    new.email,
    display_name,
    profile_role,
    normalized_phone,
    true,
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    role = case
      when public.profiles.role::text in ('admin', 'professional', 'company') then public.profiles.role
      else excluded.role
    end,
    phone = coalesce(excluded.phone, public.profiles.phone),
    is_active = true,
    updated_at = now();

  update public.profiles
  set phone_e164 = coalesce(normalized_phone, phone_e164)
  where id = new.id;

  return new;
end;
$$;

revoke all on function public.sync_credi_profile_from_auth() from public, anon, authenticated;
grant execute on function public.sync_credi_profile_from_auth() to postgres;
