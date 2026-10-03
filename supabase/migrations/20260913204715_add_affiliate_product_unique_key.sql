alter table public.affiliate_products add constraint affiliate_products_affiliate_product_key unique (affiliate_id, product_id);
