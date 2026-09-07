-- ============================================================
-- 010_order_state_machine.sql
-- Order status history
-- ============================================================
-- Migration 003 already contains the complete order_status enum,
-- including `expired`. Keep enum changes out of this migration.

CREATE TABLE IF NOT EXISTS public.order_status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    from_status text,
    to_status text NOT NULL,
    changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order
ON public.order_status_history(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_status_history_status
ON public.order_status_history(to_status);
