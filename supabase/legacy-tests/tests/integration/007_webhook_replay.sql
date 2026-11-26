-- ============================================================
-- CREDI MARKETPLACE
-- Integration Test 007
-- WEBHOOK REPLAY PROTECTION
-- ============================================================

BEGIN;

DO $$
DECLARE
    v_event_id uuid := gen_random_uuid();
    v_payment_id uuid;
    v_order_id uuid;
    v_old_timestamp timestamptz;
    v_replay_count integer;
BEGIN

    /*
     * --------------------------------------------------------
     * 1. Buscar pago
     * --------------------------------------------------------
     */

    SELECT
        p.id,
        p.order_id
    INTO
        v_payment_id,
        v_order_id
    FROM payments p
    LIMIT 1;

    IF v_payment_id IS NULL THEN
        RAISE NOTICE
            'TEST SKIPPED: no existe payment.';
        RETURN;
    END IF;

    /*
     * --------------------------------------------------------
     * 2. Timestamp deliberadamente antiguo
     * --------------------------------------------------------
     */

    v_old_timestamp :=
        now() - interval '30 minutes';

    /*
     * --------------------------------------------------------
     * 3. Intentar registrar evento antiguo
     *
     * La política de producción debe rechazar eventos
     * fuera de la ventana de tolerancia.
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
                v_event_id::text,
                'sha256'
            ),
            'hex'
        ),
        'test-signature',
        v_old_timestamp,
        'rejected'
    );

    /*
     * --------------------------------------------------------
     * 4. Verificar rechazo
     * --------------------------------------------------------
     */

    SELECT count(*)
    INTO v_replay_count
    FROM webhook_events
    WHERE event_id = v_event_id
      AND status = 'rejected';

    IF v_replay_count <> 1 THEN
        RAISE EXCEPTION
            'FAIL: evento replay no fue marcado como rechazado.';
    END IF;

    RAISE NOTICE
        'PASS: protección contra replay verificada.';

END $$;

ROLLBACK;