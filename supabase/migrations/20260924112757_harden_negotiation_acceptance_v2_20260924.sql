create or replace function public.accept_negotiation(p_negotiation_id uuid,p_offer_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare n public.negotiations; o public.negotiation_offers; u uuid:=(select auth.uid());
begin
 if u is null then raise exception 'UNAUTHORIZED' using errcode='42501'; end if;
 select * into n from public.negotiations where id=p_negotiation_id for update;
 if not found or (n.buyer_id<>u and n.seller_id<>u) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 select * into o from public.negotiation_offers where id=p_offer_id and negotiation_id=p_negotiation_id for update;
 if not found then raise exception 'OFFER_NOT_FOUND' using errcode='P0002'; end if;
 if n.state<>'open' or o.status<>'proposed' then raise exception 'INVALID_NEGOTIATION_STATE' using errcode='55000'; end if;
 if o.actor_id=u then raise exception 'CANNOT_ACCEPT_OWN_OFFER' using errcode='42501'; end if;
 if o.amount is null or o.amount<=0 then raise exception 'INVALID_OFFER_AMOUNT' using errcode='22023'; end if;
 if upper(trim(o.currency::text))<>upper(trim(n.currency::text)) then raise exception 'CURRENCY_MISMATCH' using errcode='22023'; end if;
 if n.buyer_max_price is not null and o.actor_role='buyer' and o.amount>n.buyer_max_price then raise exception 'BUYER_LIMIT_EXCEEDED' using errcode='22023'; end if;
 if n.seller_min_price is not null and o.actor_role='seller' and o.amount<n.seller_min_price then raise exception 'SELLER_LIMIT_VIOLATED' using errcode='22023'; end if;
 update public.negotiations set state='accepted',current_price=o.amount,rounds=coalesce(rounds,0)+1,updated_at=now() where id=n.id;
 update public.negotiation_offers set status='accepted' where id=o.id;
 update public.negotiation_offers set status='rejected' where negotiation_id=n.id and id<>o.id and status='proposed';
 return jsonb_build_object('status','accepted','negotiation_id',n.id,'offer_id',o.id,'amount',o.amount,'currency',o.currency);
end;$function$;
