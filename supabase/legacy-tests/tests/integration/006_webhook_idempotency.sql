-- ============================================================
-- CREDI MARKETPLACE
-- Integration Test 006
-- WEBHOOK IDEMPOTENCY
--
-- Objetivo:
-- Verificar que el mismo webhook no pueda procesarse dos veces.
--
-- Requisitos:
--   - webhook_events
--   - payments
--   - orders
--   - función de procesamiento de webhook
--
-- ============================================================

BEGIN;

DO $$
DECLARE
    v_event_id uuid := gen_random_uuid();
    v_payment_id uuid;
    v_order_id uuid;
    v_first_count integer;
    v_second_count integer;
BEGIN

    /*
     * --------------------------------------------------------
     * 1. Buscar un pago existente para la prueba
     * --------------------------------------------------------
     */

    SELECT
        p.id,
        p.order_id
    INTO
        v_payment_id,
        v_order_id
    FROM payments p
    WHERE p.status = 'pending'
    ORDER BY p.created_at
    LIMIT 1;

    IF v_payment_id IS NULL THEN
        RAISE NOTICE
            'TEST SKIPPED: no existe payment pending disponible.';
        RETURN;
    END IF;

    /*
     * --------------------------------------------------------
     * 2. Insertar primer evento
     * --------------------------------------------------------
     */

    INSERT INTO webhook_events (
        id,
        event_id,
        provider,
        event_type,
        payment_id,
        payload_hash,
        signature,
        received_at,
        processed_at,
        status
    )
    VALUES (
        gen_random_uuid(),
        v_event_id,
        'test-provider',
        'payment.succeeded',
        v_payment_id,
        encode(
            digest(
                v_event_id::text || ':payment.succeeded',
                'sha256'
            ),
            'hex'
        ),
        'test-signature',
        now(),
        NULL,
        'received'
    )
    ON CONFLICT (provider, event_id)
    DO NOTHING;

    /*
     * --------------------------------------------------------
     * 3. Confirmar primera inserción
     * --------------------------------------------------------
     */

    SELECT count(*)
    INTO v_first_count
    FROM webhook_events
    WHERE provider = 'test-provider'
      AND event_id = v_event_id;

    IF v_first_count <> 1 THEN
        RAISE EXCEPTION
            'FAIL: el primer webhook no fue almacenado correctamente.';
    END IF;

    /*
     * --------------------------------------------------------
     * 4. Intentar insertar exactamente el mismo evento
     * --------------------------------------------------------
     */

    INSERT INTO webhook_events (
        id,
        event_id,
        provider,
        event_type,
        payment_id,
        payload_hash,
        signature,
        received_at,
        status
    )
    VALUES (
        gen_random_uuid(),
        v_event_id,
        'test-provider',
        'payment.succeeded',
        v_payment_id,
        encode(
            digest(
                v_event_id::text || ':payment.succeeded',
                'sha256'
            ),
            'hex'
        ),
        'test-signature',
        now(),
        'received'
    )
    ON CONFLICT (provider, event_id)
    DO NOTHING;

    /*
     * --------------------------------------------------------
     * 5. Debe continuar existiendo solamente un evento
     * --------------------------------------------------------
     */

    SELECT count(*)
    INTO v_second_count
    FROM webhook_events
    WHERE provider = 'test-provider'
      AND event_id = v_event_id;

    IF v_second_count <> 1 THEN
        RAISE EXCEPTION
            'FAIL: webhook duplicado detectado.';
    END IF;

    RAISE NOTICE
        'PASS: webhook idempotency protegida correctamente.';

END $$;

ROLLBACK;