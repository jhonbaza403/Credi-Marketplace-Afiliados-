# Credi Marketplace — Runbook de despliegue Cloudflare

## 1. Plataforma canónica

Credi Marketplace se despliega como aplicación Next.js App Router en **Cloudflare Workers**, utilizando OpenNext y Wrangler. Supabase continúa siendo la fuente de verdad de datos, autenticación, RLS, almacenamiento y funciones de base de datos. Stripe y Twilio son integraciones opcionales sujetas a sus credenciales y configuración verificadas.

| Componente | Configuración |
|---|---|
| Aplicación | Next.js App Router, React 19, TypeScript y Tailwind CSS 4 |
| Runtime de build | Node.js 24.x, npm 11.19.1 |
| Adaptador Workers | `@opennextjs/cloudflare` |
| Worker | `credi-marketplace-afiliados` |
| Host inicial | `https://credi-marketplace-afiliados.bazajhon.workers.dev` |
| Backend | Supabase `fusnmvmveqdzmzohhlzm` |
| CI | GitHub Actions: seguridad, lint, typecheck, Vitest, Playwright, Next build y OpenNext build |

El Worker de Credi se mantiene separado de los Workers existentes `omnis-game` y `omnis-game-portal`. No se reutilizan sus nombres, bindings, secretos, rutas ni dominios.

## 2. Archivos de despliegue

- `open-next.config.ts`: configuración del adaptador OpenNext.
- `wrangler.jsonc`: identidad del Worker, entrypoint, compatibilidad, variables públicas y observabilidad.
- `package.json`: versiones fijadas del adaptador y Wrangler y comandos de build/deploy.
- `.github/workflows/ci.yml`: validaciones obligatorias.
- `.github/workflows/preview-gate.yml`: build de Workers y dry-run en cada PR.
- `.github/workflows/deploy.yml`: publicación del Worker después de CI y verificación de salud.

## 2.1. Cloudflare Workers Builds (build y preview)

Si se utiliza **Workers Builds** desde el Dashboard, el directorio raíz del proyecto debe ser la raíz del repositorio (donde están `package.json`, `package-lock.json` y `wrangler.jsonc`). Configura:

- **Build command:** `npm run build:cloudflare`
- **Preview command:** `npm run preview:cloudflare`
- **Production deploy command (si el Dashboard publica directamente):** `npm run deploy:cloudflare`

Los scripts `preview:cloudflare` y `deploy:cloudflare` ejecutan OpenNext build antes de iniciar preview o publicar. No uses `npx wrangler preview` directamente como comando de preview: Wrangler busca `.open-next/worker.js`, que no existe hasta que OpenNext haya generado el artefacto. Si el build y la vista previa se ejecutan en entornos separados, Workers Builds debe conservar o reconstruir los artefactos necesarios; no supongas que el directorio `.open-next/` se comparte automáticamente.

El flujo canónico de CI/CD de este repositorio es **GitHub Actions → Cloudflare Workers**. No configures dos publicadores de producción en paralelo. Si GitHub Actions gestiona producción, deja Workers Builds como preview/validación o desactiva su publicación automática a producción.

## 3. Secuencia de validación local

En un entorno Node.js 24 y npm 11.19.1, con las variables públicas de build y dependencias disponibles:

```bash
npm ci
npm run verify:structure
npm run audit:migrations
npm run audit:routes
npm run audit:menu
npm run audit:env
npm run audit:api
npm run audit:platform
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run build:cloudflare
npx wrangler deploy --dry-run
```

No se debe publicar si falla el build OpenNext, el análisis de tipos, las pruebas de seguridad o las pruebas del contrato de migraciones.

## 4. Despliegue GitHub Actions → Cloudflare

El flujo canónico de producción es GitHub Actions → Cloudflare Workers. No requiere conectar Workers Builds: el workflow de despliegue compila y publica el commit exacto de `main` únicamente después de que `Credi Marketplace CI` termine correctamente, y luego verifica `/api/health`.

Antes de fusionar la PR, configura en GitHub → Settings → Secrets and variables → Actions:

- **Secret** `CLOUDFLARE_API_TOKEN`: token de Cloudflare con permisos de edición/despliegue de Workers para la cuenta Credi.
- La clave pública de Supabase se declara como valor público de compilación en el workflow; no es una clave de servidor ni debe sustituirse por una `service_role`.

Secuencia:

1. Revisar que los checks de la PR estén verdes y que el diff solo afecte Credi.
2. Fusionar la PR aprobada en `main`.
3. Confirmar que la CI de `main` pase.
4. Confirmar que el workflow de despliegue publique `credi-marketplace-afiliados` y obtenga HTTP 200 en `https://credi-marketplace-afiliados.bazajhon.workers.dev/api/health`.
5. Si falta el token o una integración privada, el workflow debe fallar explícitamente; no considerar el despliegue operativo hasta resolverlo.

No se deben crear despliegues de preview contra datos reales de pagos ni cambiar los Workers `omnis-game` o `omnis-game-portal`.

## 5. Variables de entorno y secretos

Las variables `NEXT_PUBLIC_*` no son secretos y deben estar presentes durante el build para que Next.js pueda incrustarlas en el cliente. La configuración del Worker contiene los valores públicos conocidos del host y del proyecto Supabase de Credi.

Los secretos de build y los secretos de runtime son dos ámbitos diferentes. Configura los valores privados en **Worker Settings → Variables & Secrets**, y solamente los necesarios para el build en **Workers Builds → Build variables and secrets**.

Secretos de runtime que deben verificarse cuando se use cada función:

- Supabase: `SUPABASE_SECRET_KEY` o `SUPABASE_SERVICE_ROLE_KEY` y `DATABASE_URL` solo cuando la ruta realmente las necesite.
- Pagos: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y cualquier secreto específico de proveedor activado.
- LIVE: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_STREAM_WEBHOOK_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID` y `TWILIO_API_KEY_SECRET`.
- Inteligencia: `GEMINI_API_KEY` y/o `OPENAI_API_KEY`, si se usan las rutas correspondientes.
- Agentes gobernados: `AGENT_APPROVAL_SECRET`, según el contrato de la aplicación.

No guardes credenciales reales en GitHub, en `wrangler.jsonc`, en el README ni en los logs. No utilices las credenciales de Omnis para Credi.

## 6. Supabase: migraciones y la advertencia de ramas

El proyecto Supabase de Credi es `fusnmvmveqdzmzohhlzm` y el endpoint verificado es `https://fusnmvmveqdzmzohhlzm.supabase.co`.

La inspección inicial encontró 211 migraciones remotas y 213 archivos SQL en la rama. Se aplicaron de forma aditiva las dos migraciones pendientes (`credi_supply_sources_registry` y `support_fk_indexes`); el historial remoto ahora registra 213 migraciones. Los archivos locales se renombraron para coincidir con las versiones que Supabase asignó: `20261027165845` y `20261027165904`. La igualdad final de versiones debe confirmarse con CI antes de fusionar.

El aviso “This git branch is not associated with any Supabase Branch” indica que falta asociar la rama Git de preview a la integración de branching de Supabase; no lo resuelve Cloudflare. Para corregirlo:

1. En Supabase Dashboard, abre **Project Settings → Integrations → GitHub Integration**.
2. Autoriza la aplicación de Supabase en GitHub, selecciona el repositorio de Credi y usa `.` como working directory (la carpeta `supabase/` está en la raíz).
3. Habilita la sincronización automática únicamente después de revisar el coste y el comportamiento del plan actual. No crees una rama persistente de pago.
4. Revisa los logs del flujo que muestra `MIGRATIONS_FAILED` y el error SQL exacto antes de cambiar el historial de migraciones.
5. Antes de pruebas con datos transaccionales, usa un entorno de prueba aislado; no copies datos de producción a previews.

La configuración versionada `supabase/config.toml` documenta el host Cloudflare previsto, pero los valores de Site URL, redirect URLs y passkeys del **proyecto remoto de producción** deben confirmarse en el Dashboard de Auth. Cambiar el RP ID de WebAuthn puede requerir que los usuarios vuelvan a registrar sus passkeys.

## 7. Stripe y Twilio

No se debe declarar pagos o videoconferencia operativos solo porque las rutas existan en el código. Tras configurar los secretos:

- Stripe: comprueba la firma del webhook y el procesamiento idempotente con eventos de prueba.
- Twilio Video: comprueba la emisión de tokens desde servidor y el acceso del anfitrión/invitado.
- Cloudflare Stream: confirma el webhook autenticado, el estado de señal recibido, reproducción y replay.
- LIVE Chat: verifica lectura pública permitida para una sala en directo, escritura autenticada, moderación y límites de frecuencia.

Usa sesiones y operaciones de prueba; no realices cobros reales durante la validación técnica.

## 8. Smoke test tras el despliegue

```bash
curl -i https://credi-marketplace-afiliados.bazajhon.workers.dev/api/health
```

El release se considera saludable solo si el endpoint devuelve HTTP 200 y `status: "ok"`. Comprueba además la página inicial, login, catálogo público, subida de medios, creación de LIVE, chat, rutas de pago en modo de prueba y webhooks. El despliegue queda pendiente si el Worker está publicado pero los secretos de runtime, el secreto de despliegue de GitHub Actions o Auth de Supabase no están configurados.

## 9. Rollback y aislamiento

Los cambios de aplicación se revierten desde el historial de versiones/despliegues del Worker `credi-marketplace-afiliados`. No borres ni edites `omnis-game` ni `omnis-game-portal`. Nunca apuntes Credi a los secrets o bindings de otro Worker.

## 10. Criterio de salida

- [ ] GitHub Actions puede publicar en Cloudflare con `CLOUDFLARE_API_TOKEN`.
- [ ] Build estándar Next.js y build OpenNext aprobados.
- [ ] Wrangler dry-run aprobado.
- [ ] Secretos de runtime configurados sin exponer valores.
- [ ] Supabase Auth actualizado al host de producción y migraciones diagnosticadas.
- [ ] Stripe y Twilio verificados con recursos de prueba.
- [ ] `/api/health` responde 200 en el host de Credi.
- [ ] No se depende de Vercel ni Netlify para publicar Credi.
