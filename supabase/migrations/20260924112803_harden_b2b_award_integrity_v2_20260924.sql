create or replace function public.create_b2b_award(p_rfq_id uuid,p_quote_id uuid,p_buyer_id uuid,p_negotiation_id uuid default null)
returns table(award_id uuid,rfq_id uuid,quote_id uuid,buyer_id uuid,supplier_id uuid,status text,negotiation_id uuid)
language plpgsql security definer set search_path=''
as $function$
declare r public.business_rfqs; q public.business_rfq_quotes; n public.negotiations; a public.b2b_awards; u uuid:=(select auth.uid());
begin
 if u is null or p_buyer_id is null or u<>p_buyer_id then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 select * into r from public.business_rfqs where id=p_rfq_id for update;
 if not found or r.buyer_id<>u then raise exception 'RFQ_FORBIDDEN' using errcode='42501'; end if;
 if r.status not in ('open','published') then raise exception 'RFQ_NOT_OPEN' using errcode='55000'; end if;
 select * into q from public.business_rfq_quotes where id=p_quote_id and rfq_id=p_rfq_id for update;
 if not found or q.status not in ('submitted','accepted') then raise exception 'QUOTE_NOT_AWARDABLE' using errcode='55000'; end if;
 if p_negotiation_id is not null then
  select * into n from public.negotiations where id=p_negotiation_id for update;
  if not found or n.rfq_id is distinct from p_rfq_id or n.buyer_id<>u or n.seller_id<>q.supplier_id or n.state<>'accepted' then raise exception 'NEGOTIATION_MISMATCH' using errcode='42501'; end if;
 end if;
 if exists(select 1 from public.b2b_awards where rfq_id=p_rfq_id and status in ('awarded','accepted','ordered') and quote_id<>p_quote_id) then raise exception 'RFQ_ALREADY_AWARDED' using errcode='55000'; end if;
 select * into a from public.b2b_awards where rfq_id=p_rfq_id and quote_id=p_quote_id limit 1;
 if found then return query select a.id,a.rfq_id,a.quote_id,a.buyer_id,a.supplier_id,a.status,a.negotiation_id; return; end if;
 update public.business_rfq_quotes set status='accepted',updated_at=now() where id=q.id;
 update public.business_rfq_quotes set status='rejected',updated_at=now() where rfq_id=r.id and id<>q.id and status in ('submitted','accepted');
 insert into public.b2b_awards(rfq_id,quote_id,buyer_id,supplier_id,store_id,status,negotiation_id) values(r.id,q.id,u,q.supplier_id,q.store_id,'awarded',p_negotiation_id) returning * into a;
 return query select a.id,a.rfq_id,a.quote_id,a.buyer_id,a.supplier_id,a.status,a.negotiation_id;
end;$function$;
