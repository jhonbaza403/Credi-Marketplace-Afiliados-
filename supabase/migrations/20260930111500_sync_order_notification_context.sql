BEGIN;

CREATE OR REPLACE FUNCTION public.sync_credi_order_notification_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.operation_context IS DISTINCT FROM OLD.operation_context THEN
    UPDATE public.notifications
    SET metadata = metadata || jsonb_build_object(
      'operation_context',
      coalesce(NEW.operation_context, '{}'::jsonb)
    )
    WHERE entity_type = 'order'
      AND entity_id = NEW.id
      AND metadata->>'event' = 'order_created';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credi_sync_order_notification_context ON public.orders;
CREATE TRIGGER trg_credi_sync_order_notification_context
AFTER UPDATE OF operation_context ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_credi_order_notification_context();

REVOKE ALL ON FUNCTION public.sync_credi_order_notification_context() FROM PUBLIC, anon, authenticated;

COMMIT;
