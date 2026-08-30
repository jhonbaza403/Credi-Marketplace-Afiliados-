-- ============================================================
-- 010_order_state_machine.sql
-- Máquina de estados de órdenes
-- ============================================================

ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
ADD CONSTRAINT orders_status_check
CHECK (
    status IN (
        'pending',
        'paid',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded',
        'expired'
    )
);

CREATE TABLE IF NOT EXISTS public.order_status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    order_id uuid NOT NULL
        REFERENCES public.orders(id)
        ON DELETE CASCADE,

    from_status text,

    to_status text NOT NULL,

    changed_by uuid
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    reason text,

    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order
ON public.order_status_history(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_status_history_status
ON public.order_status_history(to_status);