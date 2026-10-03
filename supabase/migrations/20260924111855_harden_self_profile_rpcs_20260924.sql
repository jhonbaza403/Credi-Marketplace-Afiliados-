create or replace function public.set_my_credi_phone(p_phone text)
returns text language plpgsql security definer set search_path=''
as $function$
declare uid uuid:=(select auth.uid()); normalized text; result_pin text;
begin
 if uid is null then raise exception 'UNAUTHORIZED' using errcode='42501'; end if;
 if p_phone is null or length(trim(p_phone))>40 then raise exception 'INVALID_PHONE' using errcode='22023'; end if;
 normalized:=public.normalize_credi_phone(p_phone);
 if normalized is null then raise exception 'INVALID_PHONE' using errcode='22023'; end if;
 if exists(select 1 from public.profiles where phone_e164=normalized and id<>uid) then raise exception 'PHONE_ALREADY_IN_USE' using errcode='23505'; end if;
 update public.profiles set phone=normalized,phone_e164=normalized,updated_at=now() where id=uid;
 if not found then raise exception 'PROFILE_NOT_FOUND' using errcode='P0002'; end if;
 select credi_pin into result_pin from public.profiles where id=uid;
 return result_pin;
end;
$function$;

create or replace function public.ensure_my_credi_pin()
returns text language plpgsql security definer set search_path=''
as $function$
declare existing text; candidate text; uid uuid:=(select auth.uid());
begin
 if uid is null then raise exception 'UNAUTHORIZED' using errcode='42501'; end if;
 select credi_pin into existing from public.profiles where id=uid for update;
 if existing is not null then return existing; end if;
 for i in 1..10 loop
  candidate:=public.generate_credi_pin();
  begin
   update public.profiles set credi_pin=candidate,updated_at=now() where id=uid;
   if found then return candidate; end if;
  exception when unique_violation then null;
  end;
 end loop;
 raise exception 'CREDI_PIN_GENERATION_FAILED' using errcode='40001';
end;
$function$;
