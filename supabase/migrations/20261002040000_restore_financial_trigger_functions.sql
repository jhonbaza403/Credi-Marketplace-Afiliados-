-- Restore missing financial helpers and data-integrity triggers in isolated Preview.
-- Function bodies and grants are based on the Production catalog. No rows or secrets
-- are copied. The legacy order-status trigger is corrected to the current column names
-- and only records UPDATE transitions to avoid duplicating checkout's explicit INSERT audit.


CREATE OR REPLACE FUNCTION public.approve_settlement_allocation(p_allocation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  u uuid := auth.uid();
  a public.settlement_allocations;
  is_owner boolean;
  previous_status text;
begin
  if u is null then raise exception 'UNAUTHORIZED'; end if;

  select coalesce(platform_owner,false) into is_owner
    from public.profiles where id=u;
  if not coalesce(is_owner,false) then raise exception 'FORBIDDEN'; end if;
  if p_allocation_id is null then raise exception 'ALLOCATION_ID_REQUIRED'; end if;

  select * into a
    from public.settlement_allocations
   where id=p_allocation_id
   for update;

  if not found then raise exception 'SETTLEMENT_ALLOCATION_NOT_FOUND'; end if;

  if a.status='approved' then
    return jsonb_build_object('status','approved','allocation_id',a.id,'net_amount',a.net_amount,'currency',a.currency);
  end if;

  if a.status <> 'pending' then
    raise exception 'INVALID_SETTLEMENT_APPROVAL_STATE';
  end if;

  previous_status := a.status;

  update public.settlement_allocations
     set status='approved', updated_at=now()
   where id=a.id;

  insert into public.settlement_approval_audit(
    allocation_id, action, actor_id, previous_status, new_status, metadata
  ) values (
    a.id, 'approved', u, previous_status, 'approved',
    jsonb_build_object('source','approve_settlement_allocation')
  );

  return jsonb_build_object('status','approved','allocation_id',a.id,'net_amount',a.net_amount,'currency',a.currency);
end;
$function$;

REVOKE ALL ON FUNCTION public.approve_settlement_allocation(p_allocation_id uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.approve_settlement_allocation(p_allocation_id uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.create_pending_order_batch(p_buyer_id uuid, p_items jsonb, p_affiliate_ref text, p_region text, p_idempotency_key text DEFAULT NULL::text)
 RETURNS TABLE(order_id uuid, total_amount numeric, commission_amount numeric, currency character, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result record;
    v_region text;
BEGIN
    v_region := upper(left(nullif(btrim(p_region), ''), 32));

    IF v_region IS NULL THEN
        v_region := 'GLOBAL';
    END IF;

    SELECT *
      INTO v_result
      FROM public.create_pending_order_batch(
          p_buyer_id,
          p_items,
          p_affiliate_ref,
          p_idempotency_key
      );

    IF NOT FOUND THEN
        RAISE EXCEPTION 'order_creation_failed' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.orders
       SET region = v_region,
           updated_at = now()
     WHERE id = v_result.order_id
       AND buyer_id = p_buyer_id;

    order_id := v_result.order_id;
    total_amount := v_result.total_amount;
    commission_amount := v_result.commission_amount;
    currency := v_result.currency;
    status := v_result.status;
    RETURN NEXT;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_pending_order_batch(p_buyer_id uuid, p_items jsonb, p_affiliate_ref text, p_region text, p_idempotency_key text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_pending_order_batch(p_buyer_id uuid, p_items jsonb, p_affiliate_ref text, p_region text, p_idempotency_key text) TO service_role;

CREATE OR REPLACE FUNCTION public.protect_order_item_financial_data()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN

    IF NEW.unit_price IS DISTINCT FROM OLD.unit_price
       OR NEW.subtotal IS DISTINCT FROM OLD.subtotal THEN

      RAISE EXCEPTION
        USING
          ERRCODE = '42501',
          MESSAGE =
            'El precio histórico y subtotal de una línea de pedido no pueden modificarse.';
    END IF;

  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.protect_order_item_financial_data() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.protect_order_item_financial_data() TO PUBLIC, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reconcile_settlement_financials()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  u uuid := auth.uid();
  is_owner boolean;
  v_alloc_missing_journal int;
  v_paid_missing_audit int;
  v_posted_unlinked int;
  v_unbalanced int;
  v_wallet_deltas int;
begin
  if u is null then raise exception 'AUTH_REQUIRED'; end if;
  select coalesce(platform_owner,false) into is_owner from public.profiles where id=u;
  if not coalesce(is_owner,false) then raise exception 'FORBIDDEN'; end if;

  select count(*) into v_alloc_missing_journal
  from public.settlement_allocations a
  where a.status in ('paid','reversed')
    and not exists(select 1 from public.wallet_journals j where j.reference_type='settlement_allocation' and j.reference_id=a.id);

  select count(*) into v_paid_missing_audit
  from public.settlement_allocations a
  where a.status='paid'
    and not exists(select 1 from public.settlement_payout_audit p where p.allocation_id=a.id and p.action='paid');

  select count(*) into v_posted_unlinked
  from public.wallet_journals j
  where j.journal_type='settlement'
    and j.status='posted'
    and not exists(select 1 from public.settlement_allocations a where a.id=j.reference_id);

  select count(*) into v_unbalanced
  from (
    select j.id
    from public.wallet_journals j
    left join public.wallet_ledger l on l.journal_id=j.id
    where j.status='posted'
    group by j.id
    having coalesce(sum(case when l.direction='in' then l.amount else -l.amount end),0)<>0
  ) x;

  select count(*) into v_wallet_deltas
  from (
    select wa.id
    from public.wallet_accounts wa
    left join public.wallet_ledger l on l.wallet_id=wa.id
    group by wa.id,wa.available_balance
    having round(wa.available_balance - coalesce(sum(case when l.direction='in' then l.amount else -l.amount end),0),2)<>0
  ) x;

  return jsonb_build_object(
    'status',case when v_alloc_missing_journal+v_paid_missing_audit+v_posted_unlinked+v_unbalanced+v_wallet_deltas=0 then 'healthy' else 'attention_required' end,
    'allocation_missing_journal',v_alloc_missing_journal,
    'paid_missing_audit',v_paid_missing_audit,
    'posted_settlement_missing_allocation',v_posted_unlinked,
    'unbalanced_posted_journals',v_unbalanced,
    'wallet_balance_deltas',v_wallet_deltas,
    'checked_at',now()
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.reconcile_settlement_financials() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.reconcile_settlement_financials() TO service_role;

CREATE OR REPLACE FUNCTION public.set_listing_offers_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_listing_offers_updated_at() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.set_listing_offers_updated_at() TO PUBLIC, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_listings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_listings_updated_at() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.set_listings_updated_at() TO PUBLIC, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.validate_non_negative_money()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.price IS NOT NULL AND NEW.price < 0 THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '22003',
        MESSAGE = 'El precio no puede ser negativo.';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_non_negative_money() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.validate_non_negative_money() TO PUBLIC, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.validate_positive_quantity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '22003',
        MESSAGE = 'La cantidad debe ser mayor que cero.';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_positive_quantity() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.validate_positive_quantity() TO PUBLIC, authenticated, service_role;


CREATE OR REPLACE FUNCTION public.record_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_history (
      order_id, from_status, to_status, changed_by, reason, metadata
    )
    VALUES (
      NEW.id,
      OLD.status::text,
      NEW.status::text,
      auth.uid(),
      'Order status changed',
      jsonb_build_object('source','trg_orders_status_history')
    );
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_order_status_change() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_order_status_change() TO postgres;

DROP TRIGGER IF EXISTS trg_listing_offers_updated_at ON public.listing_offers;
CREATE TRIGGER trg_listing_offers_updated_at BEFORE UPDATE ON public.listing_offers
FOR EACH ROW EXECUTE FUNCTION public.set_listing_offers_updated_at();

DROP TRIGGER IF EXISTS trg_listings_updated_at ON public.listings;
CREATE TRIGGER trg_listings_updated_at BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.set_listings_updated_at();

DROP TRIGGER IF EXISTS trg_order_items_financial_protection ON public.order_items;
CREATE TRIGGER trg_order_items_financial_protection BEFORE UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.protect_order_item_financial_data();

DROP TRIGGER IF EXISTS trg_order_items_positive_quantity ON public.order_items;
CREATE TRIGGER trg_order_items_positive_quantity BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.validate_positive_quantity();

DROP TRIGGER IF EXISTS trg_products_non_negative_price ON public.products;
CREATE TRIGGER trg_products_non_negative_price BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.validate_non_negative_money();

DROP TRIGGER IF EXISTS trg_orders_status_history ON public.orders;
CREATE TRIGGER trg_orders_status_history AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.record_order_status_change();

