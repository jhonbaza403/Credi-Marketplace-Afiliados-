BEGIN;

-- One immutable trace ID per commercial operation.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS operation_id uuid NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE public.payment_orchestrations
  ADD COLUMN IF NOT EXISTS operation_id uuid;

ALTER TABLE public.affiliate_attributions
  ADD COLUMN IF NOT EXISTS operation_id uuid;

ALTER TABLE public.affiliate_commission_ledger
  ADD COLUMN IF NOT EXISTS operation_id uuid;

ALTER TABLE public.settlement_allocations
  ADD COLUMN IF NOT EXISTS operation_id uuid;

ALTER TABLE public.wallet_journals
  ADD COLUMN IF NOT EXISTS operation_id uuid;

ALTER TABLE public.wallet_ledger
  ADD COLUMN IF NOT EXISTS operation_id uuid;

ALTER TABLE public.commerce_events
  ADD COLUMN IF NOT EXISTS operation_id uuid;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS operation_id uuid;

CREATE INDEX IF NOT EXISTS idx_orders_operation_id ON public.orders(operation_id);
CREATE INDEX IF NOT EXISTS idx_payment_orchestrations_operation_id ON public.payment_orchestrations(operation_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_attributions_operation_id ON public.affiliate_attributions(operation_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commission_ledger_operation_id ON public.affiliate_commission_ledger(operation_id);
CREATE INDEX IF NOT EXISTS idx_settlement_allocations_operation_id ON public.settlement_allocations(operation_id);
CREATE INDEX IF NOT EXISTS idx_wallet_journals_operation_id ON public.wallet_journals(operation_id);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_operation_id ON public.wallet_ledger(operation_id);
CREATE INDEX IF NOT EXISTS idx_commerce_events_operation_id ON public.commerce_events(operation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_operation_id ON public.notifications(operation_id);

-- Backfill downstream trace IDs from the canonical order.
UPDATE public.payment_orchestrations p
SET operation_id = o.operation_id
FROM public.orders o
WHERE p.order_id = o.id
  AND p.operation_id IS NULL;

UPDATE public.affiliate_attributions a
SET operation_id = o.operation_id
FROM public.orders o
WHERE a.order_id = o.id
  AND a.operation_id IS NULL;

UPDATE public.affiliate_commission_ledger a
SET operation_id = o.operation_id
FROM public.orders o
WHERE a.order_id = o.id
  AND a.operation_id IS NULL;

UPDATE public.settlement_allocations s
SET operation_id = o.operation_id
FROM public.orders o
WHERE s.order_id = o.id
  AND s.operation_id IS NULL;

UPDATE public.wallet_ledger w
SET operation_id = s.operation_id
FROM public.settlement_allocations s
WHERE w.reference_type = 'settlement_allocation'
  AND w.reference_id = s.id
  AND w.operation_id IS NULL;

UPDATE public.commerce_events e
SET operation_id = o.operation_id
FROM public.orders o
WHERE e.metadata->>'order_id' = o.id::text
  AND e.operation_id IS NULL;

CREATE OR REPLACE FUNCTION public.sync_credi_operation_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_operation uuid;
BEGIN
  IF TG_TABLE_NAME = 'payment_orchestrations' AND NEW.order_id IS NOT NULL THEN
    SELECT operation_id INTO v_operation FROM public.orders WHERE id = NEW.order_id;
    NEW.operation_id := coalesce(NEW.operation_id, v_operation);
  ELSIF TG_TABLE_NAME IN ('affiliate_attributions','affiliate_commission_ledger','settlement_allocations') AND NEW.order_id IS NOT NULL THEN
    SELECT operation_id INTO v_operation FROM public.orders WHERE id = NEW.order_id;
    NEW.operation_id := coalesce(NEW.operation_id, v_operation);
  ELSIF TG_TABLE_NAME = 'wallet_ledger' AND NEW.reference_type = 'settlement_allocation' AND NEW.reference_id IS NOT NULL THEN
    SELECT operation_id INTO v_operation FROM public.settlement_allocations WHERE id = NEW.reference_id;
    NEW.operation_id := coalesce(NEW.operation_id, v_operation);
  ELSIF TG_TABLE_NAME = 'commerce_events' AND NEW.operation_id IS NULL AND NEW.metadata ? 'order_id' THEN
    SELECT operation_id INTO v_operation
    FROM public.orders
    WHERE id = nullif(NEW.metadata->>'order_id','')::uuid;
    NEW.operation_id := v_operation;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_payment_operation_id ON public.payment_orchestrations;
CREATE TRIGGER trg_sync_payment_operation_id
BEFORE INSERT OR UPDATE ON public.payment_orchestrations
FOR EACH ROW EXECUTE FUNCTION public.sync_credi_operation_id();

DROP TRIGGER IF EXISTS trg_sync_affiliate_attribution_operation_id ON public.affiliate_attributions;
CREATE TRIGGER trg_sync_affiliate_attribution_operation_id
BEFORE INSERT OR UPDATE ON public.affiliate_attributions
FOR EACH ROW EXECUTE FUNCTION public.sync_credi_operation_id();

DROP TRIGGER IF EXISTS trg_sync_affiliate_commission_operation_id ON public.affiliate_commission_ledger;
CREATE TRIGGER trg_sync_affiliate_commission_operation_id
BEFORE INSERT OR UPDATE ON public.affiliate_commission_ledger
FOR EACH ROW EXECUTE FUNCTION public.sync_credi_operation_id();

DROP TRIGGER IF EXISTS trg_sync_settlement_operation_id ON public.settlement_allocations;
CREATE TRIGGER trg_sync_settlement_operation_id
BEFORE INSERT OR UPDATE ON public.settlement_allocations
FOR EACH ROW EXECUTE FUNCTION public.sync_credi_operation_id();

DROP TRIGGER IF EXISTS trg_sync_wallet_ledger_operation_id ON public.wallet_ledger;
CREATE TRIGGER trg_sync_wallet_ledger_operation_id
BEFORE INSERT OR UPDATE ON public.wallet_ledger
FOR EACH ROW EXECUTE FUNCTION public.sync_credi_operation_id();

DROP TRIGGER IF EXISTS trg_sync_commerce_event_operation_id ON public.commerce_events;
CREATE TRIGGER trg_sync_commerce_event_operation_id
BEFORE INSERT OR UPDATE ON public.commerce_events
FOR EACH ROW EXECUTE FUNCTION public.sync_credi_operation_id();

-- Payment notification: emitted only on the real paid transition.
CREATE OR REPLACE FUNCTION public.notify_credi_order_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid' THEN
    PERFORM public.emit_credi_notification(
      NEW.buyer_id,
      'payment',
      'high',
      'Pago confirmado',
      'El pago de tu orden fue confirmado y el pedido continúa su procesamiento.',
      '/orders/' || NEW.id::text,
      'order',
      NEW.id,
      jsonb_build_object(
        'event','order_paid',
        'order_id',NEW.id,
        'operation_id',NEW.operation_id,
        'operation_context',coalesce(NEW.operation_context,'{}'::jsonb)
      ),
      'order_paid:buyer:' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credi_notify_order_paid ON public.orders;
CREATE TRIGGER trg_credi_notify_order_paid
AFTER UPDATE OF payment_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_credi_order_paid();

-- Make notification rows directly traceable without exposing another authorization surface.
CREATE OR REPLACE FUNCTION public.sync_credi_notification_operation_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.operation_id IS NULL AND NEW.metadata ? 'operation_id' THEN
    BEGIN
      NEW.operation_id := (NEW.metadata->>'operation_id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      NULL;
    END;
  END IF;

  IF NEW.operation_id IS NULL AND NEW.entity_type = 'order' AND NEW.entity_id IS NOT NULL THEN
    SELECT operation_id INTO NEW.operation_id FROM public.orders WHERE id = NEW.entity_id;
  ELSIF NEW.operation_id IS NULL AND NEW.entity_type = 'conversation' AND NEW.entity_id IS NOT NULL THEN
    SELECT (metadata->>'operation_id')::uuid INTO NEW.operation_id
    FROM public.conversations
    WHERE id = NEW.entity_id
      AND metadata ? 'operation_id';
  ELSIF NEW.operation_id IS NULL AND NEW.entity_type = 'settlement_allocation' AND NEW.entity_id IS NOT NULL THEN
    SELECT operation_id INTO NEW.operation_id
    FROM public.settlement_allocations
    WHERE id = NEW.entity_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_notification_operation_id ON public.notifications;
CREATE TRIGGER trg_sync_notification_operation_id
BEFORE INSERT OR UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.sync_credi_notification_operation_id();

-- Affiliate commission is now an observable financial stage.
CREATE OR REPLACE FUNCTION public.notify_credi_affiliate_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NEW.status IN ('approved','paid') AND coalesce(NEW.commission_amount,0) > 0 THEN
    SELECT user_id INTO v_user_id FROM public.affiliates WHERE id = NEW.affiliate_id;
    IF v_user_id IS NOT NULL THEN
      PERFORM public.emit_credi_notification(
        v_user_id,
        'affiliate',
        'normal',
        'Comisión generada',
        'Una comisión de afiliado quedó registrada para una orden pagada.',
        '/dashboard/affiliate',
        'order',
        NEW.order_id,
        jsonb_build_object(
          'event','affiliate_commission',
          'order_id',NEW.order_id,
          'operation_id',NEW.operation_id,
          'commission_amount',NEW.commission_amount,
          'currency',NEW.currency,
          'status',NEW.status
        ),
        'affiliate_commission:' || NEW.id::text
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credi_notify_affiliate_commission ON public.affiliate_commission_ledger;
CREATE TRIGGER trg_credi_notify_affiliate_commission
AFTER INSERT OR UPDATE ON public.affiliate_commission_ledger
FOR EACH ROW EXECUTE FUNCTION public.notify_credi_affiliate_commission();

-- Wallet settlement notifications: only actual posted credits produce them.
CREATE OR REPLACE FUNCTION public.notify_credi_wallet_settlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_role text;
BEGIN
  IF NEW.direction IN ('in','credit') AND NEW.reference_type = 'settlement_allocation' THEN
    SELECT beneficiary_id, beneficiary_role
      INTO v_user_id, v_role
    FROM public.settlement_allocations
    WHERE id = NEW.reference_id;

    IF v_user_id IS NOT NULL THEN
      PERFORM public.emit_credi_notification(
        v_user_id,
        CASE WHEN v_role = 'affiliate' THEN 'affiliate' ELSE 'payment' END,
        'normal',
        CASE WHEN v_role = 'affiliate' THEN 'Comisión disponible' ELSE 'Liquidación acreditada' END,
        CASE WHEN v_role = 'affiliate'
          THEN 'La comisión asociada a una operación pagada fue acreditada en tu Wallet.'
          ELSE 'Una liquidación fue acreditada en tu Wallet.'
        END,
        '/wallet',
        'settlement_allocation',
        NEW.reference_id,
        jsonb_build_object(
          'event','wallet_settlement',
          'operation_id',NEW.operation_id,
          'journal_id',NEW.journal_id,
          'wallet_ledger_id',NEW.id,
          'beneficiary_role',v_role
        ),
        'wallet_settlement:' || NEW.id::text
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credi_notify_wallet_settlement ON public.wallet_ledger;
CREATE TRIGGER trg_credi_notify_wallet_settlement
AFTER INSERT ON public.wallet_ledger
FOR EACH ROW EXECUTE FUNCTION public.notify_credi_wallet_settlement();

REVOKE ALL ON FUNCTION public.sync_credi_operation_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_credi_order_paid() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_credi_notification_operation_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_credi_affiliate_commission() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_credi_wallet_settlement() FROM PUBLIC, anon, authenticated;

COMMIT;