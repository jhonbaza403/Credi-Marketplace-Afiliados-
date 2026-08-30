-- ============================================================
-- Credi Marketplace
-- MIGRATION 005: Inventory
-- ============================================================

BEGIN;

-- ============================================================
-- INVENTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS public.inventory (
    product_id UUID PRIMARY KEY
        REFERENCES public.products(id)
        ON DELETE CASCADE,

    available_quantity INTEGER NOT NULL DEFAULT 0,

    reserved_quantity INTEGER NOT NULL DEFAULT 0,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT inventory_available_non_negative
        CHECK (available_quantity >= 0),

    CONSTRAINT inventory_reserved_non_negative
        CHECK (reserved_quantity >= 0)
);

-- ============================================================
-- INVENTORY RESERVATIONS
-- ============================================================

DO $$
BEGIN
    CREATE TYPE public.inventory_reservation_status AS ENUM (
        'reserved',
        'released',
        'consumed',
        'expired'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    order_id UUID NOT NULL
        REFERENCES public.orders(id)
        ON DELETE CASCADE,

    product_id UUID NOT NULL
        REFERENCES public.products(id)
        ON DELETE RESTRICT,

    quantity INTEGER NOT NULL,

    status public.inventory_reservation_status
        NOT NULL DEFAULT 'reserved',

    reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    expires_at TIMESTAMPTZ,

    released_at TIMESTAMPTZ,

    consumed_at TIMESTAMPTZ,

    CONSTRAINT inventory_reservations_quantity_positive
        CHECK (quantity > 0)
);

-- ============================================================
-- INVENTORY MOVEMENTS
-- ============================================================

DO $$
BEGIN
    CREATE TYPE public.inventory_movement_type AS ENUM (
        'initial',
        'purchase',
        'reservation',
        'release',
        'restock',
        'adjustment',
        'return',
        'refund'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    product_id UUID NOT NULL
        REFERENCES public.products(id)
        ON DELETE RESTRICT,

    order_id UUID
        REFERENCES public.orders(id)
        ON DELETE SET NULL,

    reservation_id UUID
        REFERENCES public.inventory_reservations(id)
        ON DELETE SET NULL,

    movement_type public.inventory_movement_type NOT NULL,

    quantity INTEGER NOT NULL,

    quantity_before INTEGER,
    quantity_after INTEGER,

    reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    CONSTRAINT inventory_movements_quantity_positive
        CHECK (quantity > 0),

    CONSTRAINT inventory_movements_before_non_negative
        CHECK (
            quantity_before IS NULL
            OR quantity_before >= 0
        ),

    CONSTRAINT inventory_movements_after_non_negative
        CHECK (
            quantity_after IS NULL
            OR quantity_after >= 0
        )
);

-- ============================================================
-- SINCRONIZACIÓN INICIAL DEL INVENTARIO
-- ============================================================

INSERT INTO public.inventory (
    product_id,
    available_quantity,
    reserved_quantity
)
SELECT
    p.id,
    p.stock,
    0
FROM public.products p
ON CONFLICT (product_id)
DO NOTHING;

-- ============================================================
-- FUNCIÓN DE SINCRONIZACIÓN updated_at
-- ============================================================

DROP TRIGGER IF EXISTS trg_inventory_updated_at
ON public.inventory;

CREATE TRIGGER trg_inventory_updated_at
BEFORE UPDATE ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMIT;