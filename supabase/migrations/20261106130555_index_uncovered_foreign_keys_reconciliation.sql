DO $$
BEGIN
  IF to_regclass('public.conversation_invitations') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='conversation_invitations_inviter_id_idx') THEN
    CREATE INDEX conversation_invitations_inviter_id_idx ON public.conversation_invitations(inviter_id);
  END IF;
  IF to_regclass('public.conversations') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='conversations' AND column_name='order_id')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='conversations_order_id_idx') THEN
    CREATE INDEX conversations_order_id_idx ON public.conversations(order_id);
  END IF;
  IF to_regclass('public.conversations') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='conversations' AND column_name='product_id')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='conversations_product_id_idx') THEN
    CREATE INDEX conversations_product_id_idx ON public.conversations(product_id);
  END IF;
  IF to_regclass('public.credi_supply_sources') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='credi_supply_sources' AND column_name='created_by')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='credi_supply_sources_created_by_idx') THEN
    CREATE INDEX credi_supply_sources_created_by_idx ON public.credi_supply_sources(created_by);
  END IF;
END $$;