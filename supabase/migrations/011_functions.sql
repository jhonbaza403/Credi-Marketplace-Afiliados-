-- ============================================================
-- 011_functions.sql
-- Funciones PostgreSQL auxiliares
-- ============================================================

CREATE OR REPLACE FUNCTION public.money_round(
    p_amount numeric
)
RETURNS numeric(20,2)
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT round(COALESCE(p_amount, 0), 2)::numeric(20,2);
$$;


CREATE OR REPLACE FUNCTION public.calculate_commission(
    p_base numeric,
    p_rate numeric
)
RETURNS numeric(20,2)
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT public.money_round(
        GREATEST(COALESCE(p_base, 0), 0)
        *
        GREATEST(LEAST(COALESCE(p_rate, 0), 1), 0)
    );
$$;


CREATE OR REPLACE FUNCTION public.calculate_seller_amount(
    p_total numeric,
    p_commission numeric
)
RETURNS numeric(20,2)
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT public.money_round(
        GREATEST(
            COALESCE(p_total, 0)
            -
            COALESCE(p_commission, 0),
            0
        )
    );
$$;