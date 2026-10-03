create or replace function public.initialize_order_tax_transaction(p_order_id uuid)
returns uuid language plpgsql security definer set search_path=''
as $function$
declare o public.orders; seller uuid; taxid uuid; jid uuid; snap jsonb; u uuid:=(select auth.uid()); rl record;
begin
 if u is null then raise exception 'UNAUTHORIZED'; end if;
 select * into rl from public.consume_api_rate_limit('tax_init:'||u::text,20,60); if not rl.allowed then raise exception 'RATE_LIMITED' using errcode='42900'; end if;
 if p_order_id is null then raise exception 'INVALID_ORDER_ID'; end if;
 select * into o from public.orders where id=p_order_id and buyer_id=u for update; if not found then raise exception 'ORDER_NOT_FOUND'; end if;
 if o.status::text in('cancelled','refunded') then raise exception 'ORDER_NOT_ELIGIBLE'; end if;
 select s.vendor_id into seller from public.order_items oi join public.stores s on s.id=oi.store_id where oi.order_id=p_order_id order by oi.created_at limit 1; if seller is null then raise exception 'ORDER_SELLER_NOT_FOUND'; end if;
 select id into jid from public.tax_jurisdictions where jurisdiction_code='NOT_CONFIGURED' and country_code='ZZ' and active=true limit 1;
 snap:=jsonb_build_object('engine_version','1.0.0','calculation_status','not_configured','merchant_model','marketplace_intermediary','order_id',o.id,'buyer_id',o.buyer_id,'seller_id',seller,'region',o.region,'jurisdiction_code','NOT_CONFIGURED','jurisdiction_country','ZZ','tax_category_code','generic','gross_amount',o.total_amount,'taxable_amount',0,'tax_amount',0,'currency',trim(o.currency::text),'snapshot_at',now(),'reason','No verified jurisdiction-specific tax rule is configured; no tax is asserted by the engine.');
 insert into public.tax_transactions(order_id,buyer_id,seller_id,affiliate_id,jurisdiction_id,taxpayer_role,tax_period,currency,gross_amount,taxable_amount,tax_amount,status,snapshot,source_type,source_reference,merchant_model,rule_version,calculation_status)
 values(o.id,o.buyer_id,seller,o.affiliate_id,jid,'seller',to_char(coalesce(o.created_at,now()),'YYYY-MM'),trim(o.currency::text),o.total_amount,0,0,'calculated',snap,'order',o.id::text,'marketplace_intermediary','1.0.0','not_configured')
 on conflict(order_id,source_type) where order_id is not null do update set snapshot=excluded.snapshot,seller_id=excluded.seller_id,buyer_id=excluded.buyer_id,updated_at=now() returning id into taxid;
 update public.orders set tax_engine_status='not_configured',tax_snapshot=snap,tax_amount=0,updated_at=now() where id=o.id and buyer_id=u;
 if not found then raise exception 'ORDER_UPDATE_FAILED'; end if;
 return taxid;
end;$function$;
