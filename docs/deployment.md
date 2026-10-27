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
- `.github/workflows/deploy.yml`: smoke test de la versión desplegada después de CI.

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

El flujo canónico de CI/CD se ejecuta desde GitHub Actions usando `CLOUDFLARE_API_TOKEN`; no requiere crear una conexión de Workers Builds. El workflow solo despliega el commit exacto de `main` después de que la CI haya terminado correctamente. Antes de fusionar la PR, configura en GitHub → Settings → Secrets and variables → Actions el secreto `CLOUDFLARE_API_TOKEN`. La clave pública de Supabase ya se declara como variable pública en el workflow y no debe confundirse con una clave `service_role`.

1. Abre [Cloudflare Workers & Pages](https://dash.cloudflare.com/1e37243772e113673f6ac017f0cb7eb8/workers-and-pages).
2. Crea o selecciona únicamente el Worker `credi-marketplace-afiliados`; no selecciones los Workers de Omnis.
3. En la opción de conectar Git, autoriza GitHub y selecciona `jhonbaza403/Credi-Marketplace-Afiliados-`.
4. Configura la rama de producción como `main`, raíz del repositorio `/`, comando de build `npm run build:cloudflare` y comando de deploy `npx wrangler deploy`.
5. Habilita previews solo después de decidir cómo se separarán las variables y la base de datos de preview. La vista de preview no debe apuntar a operaciones financieras reales.

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

La inspección registró 211 migraciones remotas y 211 archivos versionados, con nombres/versiones coincidentes. Por eso no se debe marcar migraciones manualmente como aplicadas ni recrear el historial sin un error SQL exacto.

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

El release se considera saludable solo si el endpoint devuelve HTTP 200 y `status: "ok"`. Comprueba además la página inicial, login, catálogo público, subida de medios, creación de LIVE, chat, rutas de pago en modo de prueba y webhooks. El despliegue queda pendiente si el Worker está publicado pero los secretos de runtime, GitHub Builds o Auth de Supabase no están configurados.

## 9. Rollback y aislamiento

Los cambios de aplicación se revierten desde el historial de versiones/despliegues del Worker `credi-marketplace-afiliados`. No borres ni edites `omnis-game` ni `omnis-game-portal`. Nunca apuntes Credi a los secrets o bindings de otro Worker.

## 10. Criterio de salida

- [ ] GitHub conectado a Workers Builds.
- [ ] Build estándar Next.js y build OpenNext aprobados.
- [ ] Wrangler dry-run aprobado.
- [ ] Secretos de runtime configurados sin exponer valores.
- [ ] Supabase Auth actualizado al host de producción y migraciones diagnosticadas.
- [ ] Stripe y Twilio verificados con recursos de prueba.
- [ ] `/api/health` responde 200 en el host de Credi.
- [ ] No se depende de Vercel ni Netlify para publicar Credi.
