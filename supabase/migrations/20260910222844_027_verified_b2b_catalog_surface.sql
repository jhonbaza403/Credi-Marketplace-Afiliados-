create or replace view public.verified_b2b_products as
select
  b.id,
  b.supplier_id,
  b.product_id,
  b.title,
  b.category,
  b.wholesale_price_usd,
  b.regular_price_usd,
  b.min_order_quantity,
  b.stock_available,
  b.image_url,
  b.video_media,
  b.description,
  b.country,
  b.status,
  b.moderation_status,
  b.created_at
from public.b2b_products b
join public.verified_businesses v on v.vendor_id = b.supplier_id
where b.status = 'published' and b.moderation_status = 'approved';

revoke all on public.verified_b2b_products from anon;
grant select on public.verified_b2b_products to authenticated;
