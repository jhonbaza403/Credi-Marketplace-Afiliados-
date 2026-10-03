DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.affiliate_product_links'::regclass AND conname = 'affiliate_product_links_affiliate_product_key') THEN ALTER TABLE public.affiliate_product_links ADD CONSTRAINT affiliate_product_links_affiliate_product_key UNIQUE (affiliate_id, product_id); END IF; END $$;

CREATE INDEX IF NOT EXISTS affiliate_product_links_product_active_idx ON public.affiliate_product_links (product_id, is_active);
CREATE INDEX IF NOT EXISTS b2b_products_public_catalog_idx ON public.b2b_products (status, moderation_status, created_at DESC);

ALTER FUNCTION public.set_affiliate_product_link_updated_at() SET search_path = public;
