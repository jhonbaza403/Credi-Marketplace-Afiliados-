create or replace function public.accept_negotiation(p_negotiation_id uuid,p_offer_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare n public.negotiations; o public.negotiation_offers; u uuid:=(select auth.uid()); rl record;
begin
 if u is null then raise exception 'UNAUTHORIZED'; end if;
 select * into rl from public.consume_api_rate_limit('negotiation_accept:'||u::text,30,60); if not rl.allowed then raise exception 'RATE_LIMITED' using errcode='42900'; end if;
 select * into n from public.negotiations where id=p_negotiation_id for update; if not found or (n.buyer_id<>u and n.seller_id<>u) then raise exception 'FORBIDDEN'; end if;
 select * into o from public.negotiation_offers where id=p_offer_id and negotiation_id=p_negotiation_id for update; if not found then raise exception 'OFFER_NOT_FOUND'; end if;
 if n.state<>'open' or o.status<>'proposed' or o.actor_id=u then raise exception 'INVALID_NEGOTIATION_STATE'; end if;
 if o.amount is null or o.amount<=0 then raise exception 'INVALID_OFFER_AMOUNT'; end if;
 if upper(trim(o.currency::text))<>upper(trim(n.currency::text)) then raise exception 'CURRENCY_MISMATCH'; end if;
 update public.negotiations set state='accepted',current_price=o.amount,rounds=coalesce(rounds,0)+1,updated_at=now() where id=n.id;
 update public.negotiation_offers set status='accepted' where id=o.id;
 update public.negotiation_offers set status='rejected' where negotiation_id=n.id and id<>o.id and status='proposed';
 return jsonb_build_object('status','accepted','negotiation_id',n.id,'offer_id',o.id,'amount',o.amount,'currency',o.currency);
end;$function$;
