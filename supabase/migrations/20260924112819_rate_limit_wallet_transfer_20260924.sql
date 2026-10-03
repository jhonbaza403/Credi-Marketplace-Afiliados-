create or replace function public.wallet_transfer(p_to_user_id uuid,p_amount numeric,p_currency text default 'USD',p_idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare f public.wallet_accounts; t public.wallet_accounts; u uuid:=(select auth.uid()); c text; a numeric; raw text; k text; old jsonb; rl record;
begin
 if u is null then raise exception 'UNAUTHORIZED' using errcode='42501'; end if;
 select * into rl from public.consume_api_rate_limit('wallet_transfer:'||u::text,20,60); if not rl.allowed then raise exception 'RATE_LIMITED' using errcode='42900'; end if;
 c:=upper(trim(coalesce(p_currency,'USD'))); if c !~ '^[A-Z]{3}$' then raise exception 'INVALID_CURRENCY'; end if;
 if p_to_user_id is null or p_to_user_id=u then raise exception 'INVALID_RECIPIENT'; end if;
 a:=round(p_amount,8); if a<=0 or a>1000000000000 then raise exception 'INVALID_AMOUNT'; end if;
 raw:=nullif(trim(p_idempotency_key),''); if raw is null or length(raw)<16 or length(raw)>200 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
 k:='transfer:'||u::text||':'||raw;
 select jsonb_build_object('status','succeeded','amount',amount,'currency',currency) into old from public.wallet_ledger where idempotency_key=k limit 1; if old is not null then return old; end if;
 insert into public.wallet_accounts(user_id,currency) values(u,c) on conflict(user_id) do nothing;
 insert into public.wallet_accounts(user_id,currency) values(p_to_user_id,c) on conflict(user_id) do nothing;
 if u::text<p_to_user_id::text then select * into f from public.wallet_accounts where user_id=u for update; select * into t from public.wallet_accounts where user_id=p_to_user_id for update;
 else select * into t from public.wallet_accounts where user_id=p_to_user_id for update; select * into f from public.wallet_accounts where user_id=u for update; end if;
 if f.currency<>c or t.currency<>c or f.status<>'active' or t.status<>'active' then raise exception 'WALLET_NOT_ACTIVE'; end if;
 if f.available_balance<a then raise exception 'INSUFFICIENT_FUNDS'; end if;
 update public.wallet_accounts set available_balance=available_balance-a,updated_at=now() where id=f.id;
 update public.wallet_accounts set available_balance=available_balance+a,updated_at=now() where id=t.id;
 insert into public.wallet_ledger(wallet_id,direction,amount,currency,entry_type,reference_type,reference_id,idempotency_key,metadata) values(f.id,'debit',a,c,'transfer','user',p_to_user_id,k,jsonb_build_object('to_user_id',p_to_user_id));
 insert into public.wallet_ledger(wallet_id,direction,amount,currency,entry_type,reference_type,reference_id,idempotency_key,metadata) values(t.id,'credit',a,c,'transfer','user',u,k||':credit',jsonb_build_object('from_user_id',u));
 return jsonb_build_object('status','succeeded','amount',a,'currency',c);
end;$function$;
