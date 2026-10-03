create or replace function public.get_credi_contact(p_identifier text)
returns table(id uuid,full_name text,avatar_url text,role text,is_active boolean,store_name text,is_verified boolean)
language plpgsql stable security definer set search_path=''
as $function$
declare n text; rl record;
begin
 if (select auth.uid()) is null then raise exception 'UNAUTHORIZED' using errcode='42501'; end if;
 if p_identifier is null or length(trim(p_identifier))=0 or length(trim(p_identifier))>120 then return; end if;
 select * into rl from public.consume_api_rate_limit('contact_lookup:'||(select auth.uid())::text,20,60);
 if not rl.allowed then raise exception 'RATE_LIMITED' using errcode='42900'; end if;
 n:=upper(trim(p_identifier));
 if n like 'CRD-%' then
  return query select p.id,p.full_name,p.avatar_url,p.role::text,p.is_active,s.store_name,s.is_verified from public.profiles p left join public.stores s on s.vendor_id=p.id and s.is_active=true where p.credi_pin=n and p.is_active=true limit 1;
  return;
 end if;
 n:=public.normalize_credi_phone(p_identifier);
 if n is null then return; end if;
 return query select p.id,p.full_name,p.avatar_url,p.role::text,p.is_active,s.store_name,s.is_verified from public.profiles p left join public.stores s on s.vendor_id=p.id and s.is_active=true where p.phone_e164=n and p.is_active=true limit 1;
end;$function$;

create or replace function public.get_credi_contact_by_pin(p_credi_pin text)
returns table(id uuid,full_name text,avatar_url text,role text,is_active boolean,store_name text,is_verified boolean)
language plpgsql stable security definer set search_path=''
as $function$
declare rl record;
begin
 if (select auth.uid()) is null then raise exception 'UNAUTHORIZED' using errcode='42501'; end if;
 if p_credi_pin is null or length(trim(p_credi_pin))<4 or length(trim(p_credi_pin))>64 then return; end if;
 select * into rl from public.consume_api_rate_limit('contact_pin_lookup:'||(select auth.uid())::text,10,60);
 if not rl.allowed then raise exception 'RATE_LIMITED' using errcode='42900'; end if;
 return query select p.id,p.full_name,p.avatar_url,p.role::text,p.is_active,s.store_name,s.is_verified from public.profiles p left join lateral(select st.store_name,st.is_verified from public.stores st where st.vendor_id=p.id and st.is_active=true order by st.is_verified desc,st.created_at asc limit 1)s on true where p.credi_pin=upper(trim(p_credi_pin)) and p.is_active=true limit 1;
end;$function$;
