begin;
alter view public.published_products set (security_invoker = false);
alter view public.published_b2b_products set (security_invoker = false);
alter view public.verified_businesses set (security_invoker = false);
alter view public.verified_b2b_products set (security_invoker = false);
commit;
