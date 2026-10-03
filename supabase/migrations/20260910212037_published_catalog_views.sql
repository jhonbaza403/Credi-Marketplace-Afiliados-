BEGIN;

CREATE OR REPLACE VIEW public.published_products AS
SELECT p.*
FROM public.products p
JOIN public.product_publication_controls c ON c.product_id = p.id
WHERE p.is_active = true
  AND c.marketplace_visible = true
  AND c.sale_enabled = true
  AND p.stock > 0;

CREATE OR REPLACE VIEW public.published_b2b_products AS
SELECT b.*
FROM public.b2b_products b
WHERE b.status = 'published'
  AND b.moderation_status = 'approved'
  AND b.stock_available > 0;

GRANT SELECT ON public.published_products TO anon, authenticated;
GRANT SELECT ON public.published_b2b_products TO anon, authenticated;

COMMIT;
