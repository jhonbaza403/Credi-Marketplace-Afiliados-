-- Internal settlement/click accounting RPCs must not be callable by end users.
-- They are reserved for trusted server-side execution.
revoke execute on function public.settle_order_inventory(uuid, text) from public, authenticated;
revoke execute on function public.record_affiliate_product_click(uuid) from public, authenticated;
grant execute on function public.settle_order_inventory(uuid, text) to service_role;
grant execute on function public.record_affiliate_product_click(uuid) to service_role;
