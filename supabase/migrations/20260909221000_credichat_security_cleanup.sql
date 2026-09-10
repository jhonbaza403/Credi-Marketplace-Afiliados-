revoke all on function public.touch_credichat_updated_at() from public, anon, authenticated;

alter table public.conversations drop constraint if exists conversations_product_id_fkey;
alter table public.conversations drop constraint if exists conversations_order_id_fkey;
alter table public.conversations drop constraint if exists conversations_store_id_fkey;
alter table public.conversations drop constraint if exists conversations_b2b_product_id_fkey;
alter table public.conversations add constraint conversations_product_id_fkey foreign key(product_id) references public.products(id) on delete set null not valid;
alter table public.conversations add constraint conversations_order_id_fkey foreign key(order_id) references public.orders(id) on delete set null not valid;
alter table public.conversations add constraint conversations_store_id_fkey foreign key(store_id) references public.stores(id) on delete set null not valid;
alter table public.conversations add constraint conversations_b2b_product_id_fkey foreign key(b2b_product_id) references public.b2b_products(id) on delete set null not valid;
