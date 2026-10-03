BEGIN;

ALTER TABLE public.b2b_products ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS b2b_products_product_idx ON public.b2b_products(product_id);
CREATE INDEX IF NOT EXISTS b2b_products_supplier_status_idx ON public.b2b_products(supplier_id, status);

ALTER TABLE public.b2b_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS b2b_products_owner_select ON public.b2b_products;
DROP POLICY IF EXISTS b2b_products_owner_insert ON public.b2b_products;
DROP POLICY IF EXISTS b2b_products_owner_update ON public.b2b_products;
DROP POLICY IF EXISTS b2b_products_owner_delete ON public.b2b_products;
DROP POLICY IF EXISTS b2b_products_public_select ON public.b2b_products;

CREATE POLICY b2b_products_owner_select ON public.b2b_products FOR SELECT USING (auth.uid() = supplier_id OR (status = 'published' AND moderation_status = 'approved'));
CREATE POLICY b2b_products_owner_insert ON public.b2b_products FOR INSERT WITH CHECK (auth.uid() = supplier_id);
CREATE POLICY b2b_products_owner_update ON public.b2b_products FOR UPDATE USING (auth.uid() = supplier_id) WITH CHECK (auth.uid() = supplier_id);
CREATE POLICY b2b_products_owner_delete ON public.b2b_products FOR DELETE USING (auth.uid() = supplier_id);

COMMIT;
