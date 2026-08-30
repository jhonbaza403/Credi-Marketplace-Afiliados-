from pathlib import Path
import zipfile

root = Path("/mnt/data/supabase/integration")
root.mkdir(parents=True, exist_ok=True)

files = {
"README.md": r"""# Integration tests — Credi Marketplace

Esta suite valida los flujos críticos de comercio, pagos, webhooks, afiliados y
órdenes contra una instancia PostgreSQL/Supabase real.

## Requisitos

- PostgreSQL/Supabase con todas las migraciones `001_*` a `024_*` aplicadas.
- Las funciones/RPC de producción deben existir, especialmente:
  - `create_pending_order_batch`
  - funciones de validación de afiliados
  - funciones de transición de órdenes
  - funciones de conciliación de pagos
- Ejecutar con un rol de pruebas aislado. No ejecutar contra producción.
- La suite presupone las tablas descritas en `supabase/migrations/`.

## Ejecución

Ejemplo con `psql`:

```bash
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f integration/001_checkout_atomicity.sql
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f integration/002_checkout_concurrency.sql
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f integration/003_checkout_idempotency.sql
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f integration/004_checkout_rollback.sql
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f integration/005_payment_lifecycle.sql
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f integration/006_webhook_idempotency.sql
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f integration/007_webhook_replay.sql
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f integration/008_affiliate_attribution.sql
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f integration/009_order_state_machine.sql
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f integration/010_financial_integrity.sql
