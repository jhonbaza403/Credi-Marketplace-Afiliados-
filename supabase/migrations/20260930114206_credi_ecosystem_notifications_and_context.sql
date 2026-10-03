CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='notification_type') THEN
  CREATE TYPE public.notification_type AS ENUM ('order','payment','affiliate','b2b','job','service','security','system');
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='notification_priority') THEN
  CREATE TYPE public.notification_priority AS ENUM ('low','normal','high','critical');
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.notifications(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 type public.notification_type NOT NULL,
 priority public.notification_priority NOT NULL DEFAULT 'normal',
 title varchar(200) NOT NULL,
 message text NOT NULL,
 action_url text,
 entity_type varchar(80),
 entity_id uuid,
 operation_id uuid,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 dedupe_key text,
 read_at timestamptz,
 expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT notifications_title_not_empty CHECK(char_length(trim(title))>0),
 CONSTRAINT notifications_message_not_empty CHECK(char_length(trim(message))>0)
);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON public.notifications(user_id,created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS notifications_entity_idx ON public.notifications(entity_type,entity_id);
CREATE INDEX IF NOT EXISTS notifications_operation_idx ON public.notifications(operation_id);
CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_dedupe_idx ON public.notifications(user_id,dedupe_key) WHERE dedupe_key IS NOT NULL;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications FOR SELECT TO authenticated USING(user_id=auth.uid());
REVOKE INSERT,UPDATE,DELETE ON public.notifications FROM anon,authenticated;
REVOKE ALL ON public.notifications FROM anon;

CREATE OR REPLACE FUNCTION public.update_notifications_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS notifications_updated_at_trigger ON public.notifications;
CREATE TRIGGER notifications_updated_at_trigger BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_notifications_updated_at();

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS operation_context jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.feed_posts ADD COLUMN IF NOT EXISTS operation_context jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS operation_context jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS operation_context jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS operation_context jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_orders_operation_product ON public.orders ((operation_context->>'product_id')) WHERE operation_context ? 'product_id';
CREATE INDEX IF NOT EXISTS idx_social_posts_operation_product ON public.feed_posts ((operation_context->>'product_id')) WHERE operation_context ? 'product_id';
CREATE INDEX IF NOT EXISTS idx_social_reels_operation_product ON public.reels ((operation_context->>'product_id')) WHERE operation_context ? 'product_id';

CREATE OR REPLACE FUNCTION public.emit_credi_notification(
 p_user_id uuid,p_type public.notification_type,p_priority public.notification_priority,p_title text,p_message text,
 p_action_url text DEFAULT NULL,p_entity_type text DEFAULT NULL,p_entity_id uuid DEFAULT NULL,
 p_metadata jsonb DEFAULT '{}'::jsonb,p_dedupe_key text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid; v_operation uuid;
BEGIN
 IF p_user_id IS NULL THEN RETURN NULL; END IF;
 BEGIN v_operation := (coalesce(p_metadata,'{}'::jsonb)->>'operation_id')::uuid; EXCEPTION WHEN invalid_text_representation THEN v_operation:=NULL; END;
 INSERT INTO public.notifications(user_id,type,priority,title,message,action_url,entity_type,entity_id,operation_id,metadata,dedupe_key)
 VALUES(p_user_id,p_type,p_priority,left(trim(p_title),200),trim(p_message),p_action_url,p_entity_type,p_entity_id,v_operation,coalesce(p_metadata,'{}'::jsonb),p_dedupe_key)
 ON CONFLICT (user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
 RETURNING id INTO v_id;
 RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.emit_credi_notification(uuid,public.notification_type,public.notification_priority,text,text,text,text,uuid,jsonb,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.notify_credi_order_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_store record;
BEGIN
 PERFORM public.emit_credi_notification(NEW.buyer_id,'order','normal','Orden creada','Tu orden fue creada y está lista para continuar con el pago.','/orders/'||NEW.id::text,'order',NEW.id,jsonb_build_object('event','order_created','order_id',NEW.id,'operation_id',NEW.operation_id,'operation_context',NEW.operation_context),'order_created:buyer:'||NEW.id::text);
 FOR v_store IN SELECT DISTINCT s.vendor_id user_id FROM public.order_items oi JOIN public.stores s ON s.id=oi.store_id WHERE oi.order_id=NEW.id AND s.vendor_id IS NOT NULL LOOP
  PERFORM public.emit_credi_notification(v_store.user_id,'order','high','Nueva orden','Tienes una nueva orden relacionada con tu catálogo.','/orders/'||NEW.id::text,'order',NEW.id,jsonb_build_object('event','order_created','order_id',NEW.id,'operation_id',NEW.operation_id,'operation_context',NEW.operation_context),'order_created:seller:'||v_store.user_id::text||':'||NEW.id::text);
 END LOOP; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_credi_notify_order_created ON public.orders;
CREATE TRIGGER trg_credi_notify_order_created AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_credi_order_created();
REVOKE ALL ON FUNCTION public.notify_credi_order_created() FROM PUBLIC,anon,authenticated;
