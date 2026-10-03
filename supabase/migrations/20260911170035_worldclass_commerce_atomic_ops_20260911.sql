create or replace function public.wallet_transfer(p_to_user_id uuid,p_amount numeric,p_currency text default 'USD',p_idempotency_key text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_from public.wallet_accounts; v_to public.wallet_accounts; v_key text; v_amount numeric;
begin
 if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
 v_amount := round(p_amount,8);
 if v_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
 if p_to_user_id is null or p_to_user_id = auth.uid() then raise exception 'INVALID_RECIPIENT'; end if;
 v_key := coalesce(nullif(trim(p_idempotency_key),''), gen_random_uuid()::text);
 insert into public.wallet_accounts(user_id,currency) values(auth.uid(),upper(p_currency)) on conflict(user_id) do nothing;
 insert into public.wallet_accounts(user_id,currency) values(p_to_user_id,upper(p_currency)) on conflict(user_id) do nothing;
 select * into v_from from public.wallet_accounts where user_id=auth.uid() for update;
 select * into v_to from public.wallet_accounts where user_id=p_to_user_id for update;
 if v_from.currency <> upper(p_currency) or v_to.currency <> upper(p_currency) then raise exception 'CURRENCY_MISMATCH'; end if;
 if v_from.status <> 'active' or v_to.status <> 'active' then raise exception 'WALLET_NOT_ACTIVE'; end if;
 if v_from.available_balance < v_amount then raise exception 'INSUFFICIENT_FUNDS'; end if;
 if exists(select 1 from public.wallet_ledger where idempotency_key=v_key) then return jsonb_build_object('status','idempotent'); end if;
 update public.wallet_accounts set available_balance=available_balance-v_amount,updated_at=now() where id=v_from.id;
 update public.wallet_accounts set available_balance=available_balance+v_amount,updated_at=now() where id=v_to.id;
 insert into public.wallet_ledger(wallet_id,direction,amount,currency,entry_type,reference_type,reference_id,idempotency_key,metadata) values(v_from.id,'debit',v_amount,upper(p_currency),'transfer','user',p_to_user_id,v_key,jsonb_build_object('to_user_id',p_to_user_id));
 insert into public.wallet_ledger(wallet_id,direction,amount,currency,entry_type,reference_type,reference_id,idempotency_key,metadata) values(v_to.id,'credit',v_amount,upper(p_currency),'transfer','user',auth.uid(),v_key||':credit',jsonb_build_object('from_user_id',auth.uid()));
 return jsonb_build_object('status','succeeded','amount',v_amount,'currency',upper(p_currency));
end $$;

revoke all on function public.wallet_transfer(uuid,numeric,text,text) from public;
grant execute on function public.wallet_transfer(uuid,numeric,text,text) to authenticated;

create or replace function public.accept_negotiation(p_negotiation_id uuid,p_offer_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_neg public.negotiations; v_offer public.negotiation_offers; v_actor uuid;
begin
 v_actor:=auth.uid(); if v_actor is null then raise exception 'UNAUTHORIZED'; end if;
 select * into v_neg from public.negotiations where id=p_negotiation_id for update;
 if not found or (v_neg.buyer_id<>v_actor and v_neg.seller_id<>v_actor) then raise exception 'FORBIDDEN'; end if;
 select * into v_offer from public.negotiation_offers where id=p_offer_id and negotiation_id=p_negotiation_id;
 if not found then raise exception 'OFFER_NOT_FOUND'; end if;
 if v_neg.state <> 'open' then raise exception 'NEGOTIATION_NOT_OPEN'; end if;
 update public.negotiations set state='accepted',current_price=v_offer.amount,rounds=rounds+1,updated_at=now() where id=p_negotiation_id;
 update public.negotiation_offers set status='accepted' where id=p_offer_id;
 update public.negotiation_offers set status='rejected' where negotiation_id=p_negotiation_id and id<>p_offer_id and status='proposed';
 return jsonb_build_object('status','accepted','negotiation_id',p_negotiation_id,'offer_id',p_offer_id,'amount',v_offer.amount,'currency',v_offer.currency);
end $$;
revoke all on function public.accept_negotiation(uuid,uuid) from public;
grant execute on function public.accept_negotiation(uuid,uuid) to authenticated;
