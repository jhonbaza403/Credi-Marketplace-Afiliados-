create or replace function public.initialize_order_tax_transaction(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_order public.orders%rowtype;
  v_seller uuid;
  v_tax_id uuid;
  v_jurisdiction uuid;
  v_snapshot jsonb;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  select * into v_order from public.orders where id=p_order_id and buyer_id=auth.uid() for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  select s.vendor_id into v_seller
  from public.order_items oi join public.stores s on s.id=oi.store_id
  where oi.order_id=p_order_id order by oi.created_at asc limit 1;

  select id into v_jurisdiction from public.tax_jurisdictions
  where jurisdiction_code='NOT_CONFIGURED' and country_code='ZZ' and active=true limit 1;

  v_snapshot := jsonb_build_object(
    'engine_version','1.0.0','calculation_status','not_configured',
    'merchant_model','marketplace_intermediary','order_id',v_order.id,
    'buyer_id',v_order.buyer_id,'seller_id',v_seller,'region',v_order.region,
    'jurisdiction_code','NOT_CONFIGURED','jurisdiction_country','ZZ',
    'tax_category_code','generic','gross_amount',v_order.total_amount,
    'taxable_amount',0,'tax_amount',0,'currency',trim(v_order.currency::text),
    'snapshot_at',now(),
    'reason','No verified jurisdiction-specific tax rule is configured; no tax is asserted by the engine.'
  );

  insert into public.tax_transactions(
    order_id,buyer_id,seller_id,affiliate_id,jurisdiction_id,taxpayer_role,tax_period,currency,
    gross_amount,taxable_amount,tax_amount,status,snapshot,source_type,source_reference,
    merchant_model,rule_version,calculation_status
  ) values (
    v_order.id,v_order.buyer_id,v_seller,v_order.affiliate_id,v_jurisdiction,'seller',
    to_char(coalesce(v_order.created_at,now()),'YYYY-MM'),trim(v_order.currency::text),
    v_order.total_amount,0,0,'calculated',v_snapshot,'order',v_order.id::text,
    'marketplace_intermediary','1.0.0','not_configured'
  )
  on conflict (order_id,source_type) where order_id is not null
  do update set snapshot=excluded.snapshot,updated_at=now()
  returning id into v_tax_id;

  update public.orders set tax_engine_status='not_configured',tax_snapshot=v_snapshot,tax_amount=0,updated_at=now() where id=p_order_id;
  return v_tax_id;
end;
$$;

grant execute on function public.initialize_order_tax_transaction(uuid) to authenticated;
