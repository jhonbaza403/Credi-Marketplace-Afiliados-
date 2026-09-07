-- ============================================================
-- 014_indexes.sql
-- Production indexes for core marketplace tables
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_products_active
ON public.products(is_active)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_store
ON public.products(store_id);

CREATE INDEX IF NOT EXISTS idx_products_category
ON public.products(category_id);

CREATE INDEX IF NOT EXISTS idx_products_active_category
ON public.products(category_id, is_active)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_stores_vendor
ON public.stores(vendor_id);

CREATE INDEX IF NOT EXISTS idx_categories_parent
ON public.categories(parent_id);

CREATE INDEX IF NOT EXISTS idx_orders_buyer
ON public.orders(buyer_id);

CREATE INDEX IF NOT EXISTS idx_orders_status
ON public.orders(status);

CREATE INDEX IF NOT EXISTS idx_orders_buyer_status
ON public.orders(buyer_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_created
ON public.orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_pending
ON public.orders(created_at)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_orders_affiliate
ON public.orders(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_order_items_order
ON public.order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product
ON public.order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_order_items_store
ON public.order_items(store_id);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order
ON public.inventory_reservations(order_id);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product
ON public.inventory_reservations(product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product
ON public.inventory_movements(product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_order
ON public.inventory_movements(order_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_reservation
ON public.inventory_movements(reservation_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_by
ON public.inventory_movements(created_by);

CREATE INDEX IF NOT EXISTS idx_affiliate_products_affiliate
ON public.affiliate_products(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_products_product
ON public.affiliate_products(product_id);

CREATE INDEX IF NOT EXISTS idx_affiliates_code
ON public.affiliates(code);

CREATE INDEX IF NOT EXISTS idx_affiliates_user
ON public.affiliates(user_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_attributions_affiliate
ON public.affiliate_attributions(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_attributions_buyer
ON public.affiliate_attributions(buyer_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_attributions_status
ON public.affiliate_attributions(status);

CREATE INDEX IF NOT EXISTS idx_affiliate_attributions_order
ON public.affiliate_attributions(order_id);

CREATE INDEX IF NOT EXISTS idx_webhooks_processing
ON public.webhook_events(received_at)
WHERE status IN ('received', 'processing');

CREATE INDEX IF NOT EXISTS idx_idempotency_cleanup
ON public.idempotency_keys(expires_at);

CREATE INDEX IF NOT EXISTS idx_order_history_recent
ON public.order_status_history(order_id, created_at DESC);
