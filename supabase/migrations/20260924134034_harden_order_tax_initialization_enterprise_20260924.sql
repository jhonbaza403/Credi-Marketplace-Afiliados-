create or replace function private.initialize_order_tax_transaction(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path=''
as $function$
declare
  o public.orders;
  seller uuid;
  seller_count integer;
  taxid uuid;
  jid uuid;
  snap jsonb;
  u uuid := (select auth.uid());
  rl record;
  v_currency text;
  v_now timestamptz := now();
begin
  if u is null then
    raise exception 'UNAUTHORIZED' using errcode='42501';
  end if;
  if p_order_id is null then
    raise exception 'INVALID_ORDER_ID' using errcode='22023';
  end if;

  select * into rl
  from public.consume_api_rate_limit('tax_init:' || u::text, 20, 60);
  if not rl.allowed then
    raise exception 'RATE_LIMITED' using errcode='42900';
  end if;

  select * into o
  from public.orders
  where id=p_order_id and buyer_id=u
  for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if o.status::text in ('cancelled','refunded') then
    raise exception 'ORDER_NOT_ELIGIBLE';
  end if;

  if o.total_amount is null or o.total_amount < 0 then
    raise exception 'INVALID_ORDER_AMOUNT';
  end if;

  v_currency := upper(trim(o.currency::text));
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'INVALID_ORDER_CURRENCY';
  end if;

  select count(distinct s.vendor_id), min(s.vendor_id)
  into seller_count, seller
  from public.order_items oi
  join public.stores s on s.id=oi.store_id
  where oi.order_id=o.id and s.vendor_id is not null;

  if seller_count = 0 or seller is null then
    raise exception 'ORDER_SELLER_NOT_FOUND';
  end if;
  if seller_count > 1 then
    raise exception 'MULTI_SELLER_ORDER_REQUIRES_SPLIT_TAX';
  end if;

  select id into jid
  from public.tax_jurisdictions
  where jurisdiction_code='NOT_CONFIGURED'
    and country_code='ZZ'
    and active=true
  order by id
  limit 1
  for update;
  if jid is null then
    raise exception 'TAX_NOT_CONFIGURED';
  end if;

  snap := jsonb_build_object(
    'engine_version','1.1.0',
    'calculation_status','not_configured',
    'merchant_model','marketplace_intermediary',
    'order_id',o.id,
    'buyer_id',o.buyer_id,
    'seller_id',seller,
    'region',o.region,
    'jurisdiction_code','NOT_CONFIGURED',
    'jurisdiction_country','ZZ',
    'tax_category_code','generic',
    'gross_amount',o.total_amount,
    'taxable_amount',0,
    'tax_amount',0,
    'currency',v_currency,
    'snapshot_at',v_now,
    'reason','No verified jurisdiction-specific tax rule is configured; the transaction is not eligible for settlement until tax configuration is available.'
  );

  insert into public.tax_transactions(
    order_id,buyer_id,seller_id,affiliate_id,jurisdiction_id,
    taxpayer_role,tax_period,currency,gross_amount,taxable_amount,
    tax_amount,status,snapshot,source_type,source_reference,
    merchant_model,rule_version,calculation_status
  )
  values(
    o.id,o.buyer_id,seller,o.affiliate_id,jid,
    'seller',to_char(coalesce(o.created_at,v_now),'YYYY-MM'),v_currency,
    o.total_amount,0,0,'void',snap,'order',o.id::text,
    'marketplace_intermediary','1.1.0','not_configured'
  )
  on conflict(order_id,source_type) where order_id is not null
  do update set
    buyer_id=excluded.buyer_id,
    seller_id=excluded.seller_id,
    affiliate_id=excluded.affiliate_id,
    jurisdiction_id=excluded.jurisdiction_id,
    taxpayer_role=excluded.taxpayer_role,
    tax_period=excluded.tax_period,
    currency=excluded.currency,
    gross_amount=excluded.gross_amount,
    taxable_amount=excluded.taxable_amount,
    tax_amount=excluded.tax_amount,
    status=case
      when public.tax_transactions.status in ('collected','withheld','reported','reversed')
      then public.tax_transactions.status
      else 'void'
    end,
    snapshot=excluded.snapshot,
    merchant_model=excluded.merchant_model,
    rule_version=excluded.rule_version,
    calculation_status='not_configured',
    updated_at=v_now
  returning id into taxid;

  update public.orders
  set tax_engine_status='not_configured',
      tax_snapshot=snap,
      tax_amount=0,
      updated_at=v_now
  where id=o.id and buyer_id=u;

  if not found then
    raise exception 'ORDER_UPDATE_FAILED';
  end if;

  return taxid;
end;
$function$;

revoke all on function private.initialize_order_tax_transaction(uuid) from public,anon,authenticated;

create or replace function public.initialize_order_tax_transaction(p_order_id uuid)
returns uuid
language sql
security invoker
set search_path=''
as $function$
  select private.initialize_order_tax_transaction($1);
$function$;

revoke all on function public.initialize_order_tax_transaction(uuid) from public,anon;
grant execute on function public.initialize_order_tax_transaction(uuid) to authenticated;
