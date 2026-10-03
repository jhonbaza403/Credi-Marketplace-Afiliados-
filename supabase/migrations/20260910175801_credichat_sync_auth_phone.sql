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
  profile_role := case when requested_role in ('vendor','customer','admin','affiliate','business','supplier') then requested_role else 'customer' end;
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
  update public.profiles set phone_e164 = normalized_phone where id = new.id and normalized_phone is not null;
  return new;
end;
$$;

revoke all on function public.sync_credi_profile_from_auth() from public;

drop trigger if exists trg_credi_sync_profile_from_auth on auth.users;
create trigger trg_credi_sync_profile_from_auth
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.sync_credi_profile_from_auth();

create or replace function public.set_my_credi_phone(p_phone text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  normalized text := public.normalize_credi_phone(p_phone);
  result_pin text;
begin
  if uid is null then raise exception 'Sesión requerida.' using errcode = '42501'; end if;
  if normalized is null then raise exception 'El número debe incluir el código de país, por ejemplo +58 412 1234567.'; end if;
  update public.profiles set phone = normalized, phone_e164 = normalized, updated_at = now() where id = uid;
  if not found then raise exception 'No existe el perfil del usuario.'; end if;
  select p.credi_pin into result_pin from public.profiles p where p.id = uid;
  return result_pin;
end;
$$;

revoke all on function public.set_my_credi_phone(text) from public;
grant execute on function public.set_my_credi_phone(text) to authenticated;
