# GitHub + Cloudflare: contrato operativo de Credi Marketplace

## Fuente de verdad

- **GitHub** mantiene el código, revisiones, Actions, auditoría de dependencias y detección de secretos.
- **Cloudflare Workers** ejecuta la aplicación Next.js mediante el adaptador OpenNext. Workers Builds enlaza el repositorio y publica el Worker independiente `credi-marketplace`.
- **Supabase** mantiene PostgreSQL, Auth, RLS, Storage y funciones de base de datos.
- **Stripe** y **Twilio** funcionan solo después de verificar sus secretos, webhooks y credenciales en el entorno Credi.

## Recursos aislados

- Worker Credi: `credi-marketplace`.
- Host inicial: `https://credi-marketplace.bazajhon.workers.dev`.
- Supabase Credi: `fusnmvmveqdzmzohhlzm`.
- Los Workers `omnis-game` y `omnis-game-portal` quedan fuera de este despliegue y no deben compartir bindings ni secretos.

## CI/CD

| Flujo | Propósito |
|---|---|
| `.github/workflows/ci.yml` | Contrato de repositorio, dependencias, migraciones, seguridad, lint, types, unit, E2E, build Next.js y build OpenNext. |
| `.github/workflows/preview-gate.yml` | Valida cada PR con el build Cloudflare y un Wrangler dry-run; no publica la rama. |
| `.github/workflows/deploy.yml` | Después de CI en `main`, verifica que el host de Credi responda saludable. |
| `.github/workflows/security.yml` | Política de vulnerabilidades y auditoría automatizada. |
| `.github/workflows/secrets.yml` | Detección de secretos comprometidos. |
| `.github/workflows/codeql.yml` | Análisis estático de JavaScript/TypeScript. |
| `.github/workflows/dependency-review.yml` | Revisión de cambios de dependencias en PR. |
| `.github/workflows/production-e2e.yml` | Recorrido de prueba manual con cuenta y recursos de test de mínimo privilegio. |

## Configuración del Worker

`wrangler.jsonc` fija nombre, entrypoint OpenNext, fecha de compatibilidad, `nodejs_compat`, host de Workers y observabilidad. La auditoría del repositorio comprueba que el Worker conserve el nombre aislado y que el host canónico sea el de Credi.

Los comandos versionados son:

```bash
npm ci
npm run build
npm run build:cloudflare
npm run cf-typegen
npx wrangler deploy --dry-run
npm run deploy:cloudflare
```

El último comando solo se ejecuta desde una sesión autorizada a la cuenta Cloudflare correcta o por Workers Builds conectado. No se debe usar un token de otro proyecto.

## Variables y secretos

Las variables públicas `NEXT_PUBLIC_*` se documentan en `.env.example` y deben estar presentes durante el build. Las credenciales runtime se configuran en **Cloudflare Dashboard → Worker → Settings → Variables & Secrets**. Los secretos de build se configuran en **Workers Builds → Build variables and secrets** y no se deben confundir con las variables runtime.

No se versionan `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_STREAM_WEBHOOK_SECRET`, claves privilegiadas de Supabase, secretos de Stripe o tokens de Twilio. `CLOUDFLARE_ACCOUNT_ID` es un identificador, no un token de autorización.

## Vinculación de GitHub pendiente

La cuenta Cloudflare confirmó que todavía está desconectada de GitHub para Workers Builds. El enlace debe completarse desde [Cloudflare Workers & Pages](https://dash.cloudflare.com/1e37243772e113673f6ac017f0cb7eb8/workers-and-pages), seleccionando solo Credi y la rama `main`. Configurar:

- Root directory: `/`
- Build command: `npm run build:cloudflare`
- Deploy command: `npx wrangler deploy`
- Production branch: `main`

Preview builds deben permanecer aislados de pagos reales y no deben apuntar a credenciales de Omnis.

## Supabase Git integration y MIGRATIONS_FAILED

La advertencia de “branch not associated” pertenece a la integración GitHub de Supabase y no a Cloudflare. El proyecto tiene 211 migraciones registradas y 211 archivos locales coincidentes. No se deben reescribir ni reparar marcadores sin el error SQL exacto. Autoriza la GitHub Integration en Supabase Dashboard, usa working directory `.` y activa el branching automático solo después de revisar sus costes. No crear ramas persistentes facturables por defecto.

## Criterio de despliegue real

Una PR aprobada no equivale a un despliegue publicado. Credi se declara operativo cuando:
1. Workers Builds está enlazado al repositorio y rama correcta.
2. CI, pruebas y build OpenNext pasan.
3. El Worker de Credi publica con secretos correctos.
4. `/api/health` devuelve HTTP 200 y `status: "ok"`.
5. Supabase Auth, Stripe webhooks, Twilio tokens y Cloudflare Stream se prueban con usuarios y operaciones de test.
