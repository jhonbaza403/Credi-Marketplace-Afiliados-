-- ============================================================
-- CREDI MARKETPLACE
-- Integration Test 009
-- ORDER STATE MACHINE
-- ============================================================

BEGIN;

DO $$
DECLARE
    v_order_id uuid;
    v_status text;
    v_history_count integer;
BEGIN

    /*
     * --------------------------------------------------------
     * 1. Obtener orden
     * --------------------------------------------------------
     */

    SELECT
        id,
        status
    INTO
        v_order_id,
        v_status
    FROM orders
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_order_id IS NULL THEN
        RAISE NOTICE
            'TEST SKIPPED: no existe ninguna orden.';
        RETURN;
    END IF;

    /*
     * --------------------------------------------------------
     * 2. Verificar estado válido
     * --------------------------------------------------------
     */

    IF v_status NOT IN (
        'pending',
        'paid',
        'failed',
        'cancelled',
        'refunded'
    ) THEN

        RAISE EXCEPTION
            'FAIL: estado de orden desconocido: %',
            v_status;

    END IF;

    /*
     * --------------------------------------------------------
     * 3. Verificar historial
     * --------------------------------------------------------
     */

    SELECT count(*)
    INTO v_history_count
    FROM order_status_history
    WHERE order_id = v_order_id;

    IF v_history_count = 0 THEN
        RAISE EXCEPTION
            'FAIL: la orden no posee historial de estados.';
    END IF;

    /*
     * --------------------------------------------------------
     * 4. Verificar que el estado actual tenga historial
     * --------------------------------------------------------
     */

    IF NOT EXISTS (
        SELECT 1
        FROM order_status_history
        WHERE order_id = v_order_id
          AND status = v_status
    ) THEN

        RAISE EXCEPTION
            'FAIL: estado actual no coincide con historial.';
    END IF;

    /*
     * --------------------------------------------------------
     * 5. Verificar ausencia de transiciones imposibles
     *
     * Estados terminales:
     *   refunded
     *   cancelled
     *
     * Una orden terminal no debe regresar a pending.
     * --------------------------------------------------------
     */

    IF EXISTS (
        SELECT 1
        FROM order_status_history h1
        JOIN order_status_history h2
          ON h2.order_id = h1.order_id
         AND h2.created_at > h1.created_at
        WHERE h1.status IN ('cancelled', 'refunded')
          AND h2.status = 'pending'
    ) THEN

        RAISE EXCEPTION
            'FAIL: transición inválida desde estado terminal.';

    END IF;

    /*
     * --------------------------------------------------------
     * 6. Verificar historial cronológico
     * --------------------------------------------------------
     */

    IF EXISTS (
        SELECT 1
        FROM order_status_history h1
        JOIN order_status_history h2
          ON h2.order_id = h1.order_id
         AND h2.created_at < h1.created_at
        WHERE h1.id < h2.id
    ) THEN

        RAISE NOTICE
            'WARNING: existen registros de historial con IDs no cronológicos.';

    END IF;

    RAISE NOTICE
        'PASS: máquina de estados de órdenes verificada.';

END $$;

ROLLBACK;