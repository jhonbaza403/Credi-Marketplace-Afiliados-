-- ============================================================
-- 014_indexes.sql
-- Índices de producción
-- ============================================================

-- ============================================================
-- PRODUCTS
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


-- ============================================================
-- ORDERS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orders_customer
ON public.orders(customer_id);

CREATE INDEX IF NOT EXISTS idx_orders_status
ON public.orders(status);

CREATE INDEX IF NOT EXISTS idx_orders_customer_status
ON public.orders(
    customer_id,
    status
);

CREATE INDEX IF NOT EXISTS idx_orders_created
ON public.orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_pending
ON public.orders(created_at)
WHERE status = 'pending';


-- ============================================================
-- ORDER ITEMS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_order_items_order
ON public.order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product
ON public.order_items(product_id);


-- ============================================================
-- INVENTORY
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_products_stock
ON public.products(stock);

CREATE INDEX IF NOT EXISTS idx_products_available
ON public.products(is_active, stock)
WHERE is_active = true
  AND stock > 0;


-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_payments_pending
ON public.payment_intents(created_at)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_payments_paid
ON public.payment_intents(paid_at)
WHERE status = 'paid';

CREATE INDEX IF NOT EXISTS idx_payments_order_status
ON public.payment_intents(
    order_id,
    status
);


-- ============================================================
-- AFFILIATES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_affiliate_attribution_order
ON public.affiliate_attributions(order_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_attribution_status
ON public.affiliate_attributions(status);

CREATE INDEX IF NOT EXISTS idx_affiliate_attribution_date
ON public.affiliate_attributions(attributed_at DESC);


-- ============================================================
-- WEBHOOKS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_webhooks_processing
ON public.webhook_events(received_at)
WHERE status IN (
    'received',
    'processing'
);


-- ============================================================
-- IDEMPOTENCY
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_idempotency_cleanup
ON public.idempotency_keys(expires_at);

-- ============================================================
-- STATUS HISTORY
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_order_history_recent
ON public.order_status_history(
    order_id,
    created_at DESC
);