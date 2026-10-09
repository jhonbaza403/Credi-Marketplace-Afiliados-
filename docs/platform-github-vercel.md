# GitHub + Vercel: contrato operativo de Credi Marketplace

Este documento define qué configuración es canónica, qué credenciales necesita cada flujo y qué comprobaciones son realmente bloqueantes. No contiene valores secretos ni reemplaza la configuración del proyecto en Vercel, GitHub, Supabase o Stripe.

## Fuente de verdad

- **GitHub** mantiene código, revisiones, Actions, auditorías, controles de secretos y trazabilidad de cambios.
- **Vercel** ejecuta la aplicación Next.js, las vistas previas y los despliegues de producción conectados al repositorio.
- **Supabase** mantiene PostgreSQL, Auth, RLS, Storage y funciones de base de datos.
- **Stripe** mantiene los pagos que se hayan habilitado y los webhooks verificados.

La aplicación no debe depender de Netlify para compilar, desplegar o validar una versión.

## Flujos conservados

| Flujo / archivo | Propósito | Dependencias y criterio |
| --- | --- | --- |
| `.github/workflows/ci.yml` | Validación de contrato, dependencias, estructura, rutas, variables, seguridad, lint, TypeScript, pruebas unitarias, Playwright y build | Node 24, npm 11.19.1, lockfile versionado y checks de proyecto |
| `.github/workflows/preview-gate.yml` | Verificar el estado de la vista previa asociada a un PR | Estado canónico de Vercel; puede usarse como check requerido para el merge |
| `.github/workflows/deploy.yml` | Verificación posterior al CI de la señal de Vercel del mismo commit | Es observabilidad/atestación post-CI; por sí sola **no** inicia ni bloquea un despliegue Vercel |
| `.github/workflows/security.yml` | Auditoría de dependencias y política de seguridad | Push a `main`/`develop`, PR contra `main` y ejecución programada |
| `.github/workflows/secrets.yml` | Detección de secretos comprometidos | Gitleaks y GitHub Actions |
| `.github/workflows/codeql.yml` | Análisis estático de seguridad | CodeQL en JavaScript/TypeScript |
| `.github/workflows/dependency-review.yml` | Auditoría de dependencias en PR | Revisión de árbol y política de seguridad |
| `.github/workflows/production-e2e.yml` | Pruebas manuales del recorrido LIVE/media/transacción en un entorno de prueba controlado | Secretos E2E explícitos; nunca debe usar operaciones financieras reales |
| `.github/workflows/vercel-platform-admin.yml` | Tareas administrativas manuales opcionales sobre Vercel | Token dedicado y alcance mínimo; revisar cambios antes de aplicar dominios, firewall o máquinas |

## Contrato de despliegue Vercel

`vercel.json` es la configuración versionada canónica: framework `nextjs`, instalación `npm ci`, build `npm run build` e ignore command `node scripts/vercel-ignore-build.mjs`.

El ignore command permite omitir builds si el commit contiene únicamente archivos de documentación, pruebas, migraciones SQL, scripts de mantenimiento/CI o configuración de GitHub. Si el diff no se puede inspeccionar, adopta el modo seguro y permite el build. Los cambios de código, rutas, dependencias y configuración runtime deben producir un build.

La integración Git de Vercel es la encargada de crear los despliegues reales. El workflow `deploy.yml` comprueba el estado del mismo commit después del CI; no debe interpretarse como una barrera previa al despliegue. Para bloquear promoción/alias se necesitan Deployment Checks nativos de Vercel; para bloquear el merge se necesita exigir los checks en la regla de rama o ruleset de GitHub. La regla de rama no puede verificarse desde este contrato estático.

## Secretos de GitHub Actions

| Nombre | Uso | Política |
| --- | --- | --- |
| `VERCEL_TOKEN` | Workflow manual de administración Vercel | Opcional para CI estándar; crear como secret de repositorio/entorno, con acceso mínimo al scope `bazwjhon-2554s-projects` y al proyecto `credi-marketplace-afiliados` |
| `E2E_BASE_URL` | URL HTTPS del entorno de prueba para E2E de producción | Obligatorio solo al lanzar el workflow manual |
| `E2E_OPERATION_ID` | Identificador de operación/dataset de prueba | Obligatorio solo en E2E manual; no debe representar una operación con dinero real |
| `E2E_LIVE_ROOM_ID` | Sala LIVE reservada para la prueba | Obligatorio solo en E2E manual y perteneciente a un entorno controlado |
| `E2E_STORAGE_STATE_JSON` | Estado de sesión de Playwright para cuenta de prueba | Guardar como secret, nunca en Git; utilizar una cuenta de mínimo privilegio y rotar cuando corresponda |

`GITHUB_TOKEN` lo proporciona GitHub Actions a cada ejecución. No se debe crear manualmente un token con más permisos para sustituirlo. Los workflows deben conservar permisos mínimos por archivo.

## Variables del proyecto Vercel

Las variables de la aplicación se configuran en **Vercel Project Settings → Environment Variables**, separadas por Production, Preview y Development según el uso. El template local `.env.example` contiene nombres y placeholders; no es la fuente de valores productivos.

Variables centrales:

- Públicas necesarias para conectar el cliente Supabase: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Server-only cuando cada función esté habilitada: claves de Supabase servidor, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y claves de proveedores AI o media.
- `VERCEL_GIT_COMMIT_SHA` y `VERCEL_GIT_PREVIOUS_SHA` son datos del sistema que Vercel inyecta. No deben copiarse a GitHub Secrets ni configurarse manualmente para el ignore command.

Las variables `NEXT_PUBLIC_*` se exponen al navegador; nunca deben contener claves secretas. No se deben imprimir valores secretos en logs ni sincronizarlos mediante un commit.

## Criterios de seguridad y operación

1. El lockfile versionado se valida tal como está; CI no debe reescribirlo para luego validar una versión regenerada.
2. La prueba E2E de producción es manual y usa cuentas/datos de prueba. Checkout, webhook, comisiones y wallet requieren idempotencia y un modo de prueba seguro.
3. Cambios en SQL se despliegan y verifican en Supabase, no con un build Vercel. No reordenar ni eliminar migraciones históricas sin comparar antes el historial remoto.
4. Un workflow exitoso no prueba por sí solo que la protección de rama esté configurada ni que los secretos existan. La disponibilidad de cada secret se valida al ejecutar el workflow que lo necesita.
5. Los workflows de GitHub, la configuración Vercel, los controles de seguridad y la documentación de despliegue se conservan mientras cumplan este contrato y no dupliquen o interfieran con los despliegues canónicos.

## Auditoría reproducible

```bash
npm run audit:platform
npm run check
```

La auditoría comprueba la presencia y coherencia de workflows, comandos Vercel, nombres de scripts, los contextos canónicos de despliegue y la ausencia de referencias de Netlify en GitHub Actions. No puede consultar ni modificar valores secretos, protección de ramas ni settings privados de Vercel.
