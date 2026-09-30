BEGIN;

-- Shared operation state: survives navigation and becomes part of the durable order/social/chat context.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS operation_context jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.feed_posts
  ADD COLUMN IF NOT EXISTS operation_context jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS operation_context jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.reels
  ADD COLUMN IF NOT EXISTS operation_context jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.advertisements
  ADD COLUMN IF NOT EXISTS operation_context jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_orders_operation_product
  ON public.orders ((operation_context->>'product_id'))
  WHERE operation_context ? 'product_id';

CREATE INDEX IF NOT EXISTS idx_social_posts_operation_product
  ON public.feed_posts ((operation_context->>'product_id'))
  WHERE operation_context ? 'product_id';

CREATE INDEX IF NOT EXISTS idx_social_reels_operation_product
  ON public.reels ((operation_context->>'product_id'))
  WHERE operation_context ? 'product_id';

-- Notification events are first-class ecosystem events, not ad-hoc UI messages.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'commerce';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'chat';

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dedupe_key text;

CREATE UNIQUE INDEX IF NOT EXISTS ux_notifications_user_dedupe
  ON public.notifications(user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.emit_credi_notification(
  p_user_id uuid,
  p_type public.notification_type,
  p_priority public.notification_priority,
  p_title text,
  p_message text,
  p_action_url text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_dedupe_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications(
    user_id, type, priority, title, message, action_url,
    entity_type, entity_id, metadata, dedupe_key
  )
  VALUES (
    p_user_id, p_type, p_priority, left(trim(p_title), 200),
    trim(p_message), p_action_url, p_entity_type, p_entity_id,
    coalesce(p_metadata, '{}'::jsonb), p_dedupe_key
  )
  ON CONFLICT (user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.emit_credi_notification(uuid, public.notification_type, public.notification_priority, text, text, text, text, uuid, jsonb, text) FROM PUBLIC, anon, authenticated;

-- New order: notify the buyer and every seller represented in the order.
CREATE OR REPLACE FUNCTION public.notify_credi_order_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_store record;
BEGIN
  PERFORM public.emit_credi_notification(
    NEW.buyer_id,
    'commerce',
    'normal',
    'Orden creada',
    'Tu orden fue creada y está lista para continuar con el pago.',
    '/orders/' || NEW.id::text,
    'order',
    NEW.id,
    jsonb_build_object('event', 'order_created', 'order_id', NEW.id, 'operation_context', NEW.operation_context),
    'order_created:buyer:' || NEW.id::text
  );

  FOR v_store IN
    SELECT DISTINCT s.vendor_id AS user_id
    FROM public.order_items oi
    JOIN public.stores s ON s.id = oi.store_id
    WHERE oi.order_id = NEW.id
      AND s.vendor_id IS NOT NULL
  LOOP
    PERFORM public.emit_credi_notification(
      v_store.user_id,
      'commerce',
      'high',
      'Nueva orden',
      'Tienes una nueva orden relacionada con tu catálogo.',
      '/orders/' || NEW.id::text,
      'order',
      NEW.id,
      jsonb_build_object('event', 'order_created', 'order_id', NEW.id, 'operation_context', NEW.operation_context),
      'order_created:seller:' || v_store.user_id::text || ':' || NEW.id::text
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credi_notify_order_created ON public.orders;
CREATE TRIGGER trg_credi_notify_order_created
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_credi_order_created();

-- New direct chat membership: notify the recipient with the same product/order context.
CREATE OR REPLACE FUNCTION public.notify_credi_chat_member_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_conversation record;
  v_product_title text;
  v_operation jsonb;
BEGIN
  SELECT c.created_by, c.title, c.product_id, c.order_id, c.metadata
    INTO v_conversation
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id;

  IF v_conversation.created_by IS NULL OR NEW.user_id = v_conversation.created_by THEN
    RETURN NEW;
  END IF;

  IF v_conversation.product_id IS NOT NULL THEN
    SELECT p.title INTO v_product_title
    FROM public.products p
    WHERE p.id = v_conversation.product_id;
  END IF;

  v_operation := coalesce(v_conversation.metadata->'operation_context', '{}'::jsonb);
  IF v_conversation.product_id IS NOT NULL THEN
    v_operation := jsonb_set(v_operation, '{product_id}', to_jsonb(v_conversation.product_id::text), true);
  END IF;
  IF v_conversation.order_id IS NOT NULL THEN
    v_operation := jsonb_set(v_operation, '{order_id}', to_jsonb(v_conversation.order_id::text), true);
  END IF;

  PERFORM public.emit_credi_notification(
    NEW.user_id,
    'chat',
    'normal',
    'Nueva conversación comercial',
    coalesce('Tienes una nueva conversación' || CASE WHEN v_product_title IS NOT NULL THEN ' sobre ' || v_product_title ELSE '' END || '.', 'Tienes una nueva conversación comercial.'),
    '/chat?conversation=' || NEW.conversation_id::text,
    'conversation',
    NEW.conversation_id,
    jsonb_build_object('event', 'conversation_created', 'conversation_id', NEW.conversation_id, 'operation_context', v_operation),
    'conversation_created:' || NEW.user_id::text || ':' || NEW.conversation_id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credi_notify_chat_member_added ON public.conversation_members;
CREATE TRIGGER trg_credi_notify_chat_member_added
AFTER INSERT ON public.conversation_members
FOR EACH ROW
EXECUTE FUNCTION public.notify_credi_chat_member_added();

COMMIT;
