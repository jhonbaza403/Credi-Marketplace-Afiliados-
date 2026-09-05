# Credi Marketplace — Agent Instructions

## Proyecto

Credi Marketplace es un marketplace abierto para productos, bienes, servicios, ofertas, tiendas, B2B, afiliación empresarial y distribución de contenido social.

## Stack canónico

- Next.js 16.3.x App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Node.js 22.x
- npm 10.x
- Supabase PostgreSQL/Auth/Storage
- `@supabase/ssr` y `@supabase/supabase-js`
- Vercel
- Vitest + Playwright

No migrar a Next.js Pages Router, Node 24, Tailwind 3, Redux, microservicios, Kubernetes, Elasticsearch u OpenNext sin una decisión arquitectónica explícita.

## Supabase: reglas obligatorias

1. Usar `src/lib/supabase/client.ts` para Browser Client.
2. Usar `src/lib/supabase/server.ts` para Server Components, Server Actions y Route Handlers que necesiten la sesión.
3. Usar `src/lib/supabase/admin.ts` exclusivamente server-side para operaciones privilegiadas.
4. Usar `src/proxy.ts` para el flujo de sesión/cookies de Next.js.
5. No crear `src/utils/supabase/` ni clientes duplicados.
6. No exponer claves secretas, service-role keys, contraseñas PostgreSQL ni tokens OAuth al cliente.
7. Las variables públicas canónicas son `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
8. Las variables privadas solo se consumen en código server-only y en Vercel/server runtime.
9. No reemplazar `@supabase/ssr` por `@supabase/server` de forma global solo porque aparezca en una guía. Evaluar primero el runtime y el caso de uso.
10. No añadir Npgsql, `appsettings.json` ni un backend .NET al proyecto Next.js. Esas instrucciones son opcionales para una aplicación .NET independiente y no forman parte del stack canónico.
11. Drizzle ORM es opcional. No duplicar el acceso a PostgreSQL sin una decisión explícita. Supabase client/RPC/migrations siguen siendo la fuente canónica.

## Base de datos

- Las migraciones viven en `supabase/migrations/`.
- Los tests SQL viven en `supabase/tests/`.
- Revisar el orden completo de migraciones antes de modificar enums, constraints, triggers o funciones.
- RLS debe permanecer habilitado en tablas expuestas y las políticas deben seguir mínimo privilegio.
- No introducir tablas de demostración como `instruments` en producción solo por seguir el quickstart de Supabase. Puede utilizarse como smoke test aislado si se decide explícitamente.

## Marketplace

Una publicación (`listing`) puede representar un producto, bien, servicio u otro clasificado permitido por la política de la plataforma.

Las ofertas (`listing_offers`) son distintas de publicaciones patrocinadas y anuncios.

Un usuario puede tener capacidades de comprador, vendedor, proveedor de servicios, creador/afiliado y cliente B2B según sus permisos y requisitos de elegibilidad.

## Afiliación

La afiliación empresarial de Credi Marketplace es independiente de cualquier sistema interno de recompensas a vendedores o creadores. No asumir que una comisión externa de Amazon/SHEIN/AliExpress/Alibaba se reparte automáticamente entre usuarios.

Los enlaces de programas externos deben respetar los términos del proveedor, disclosures y requisitos de cada programa.

## Social Publishing

El flujo canónico es:

```text
Listing / Offer
      ↓
Content Composer
      ↓
Social Queue
      ↓
Adapter/API por plataforma
      ↓
TikTok / TikTok Shop / YouTube / Instagram / Facebook / Threads / Pinterest / LinkedIn / otros
```

Una publicación de Credi es la fuente original. Cada plataforma tiene sus propios OAuth scopes, APIs, formatos, límites y requisitos de revisión. No fingir compatibilidad automática si el proveedor no la autoriza.

Nunca almacenar tokens OAuth en texto plano en tablas o repositorio.

## Seguridad

- Nunca pedir ni incluir secretos en commits.
- Nunca copiar valores `sb_secret_*`, service-role keys o contraseñas PostgreSQL al README, código o logs.
- Si un secreto aparece expuesto, recomendar rotación inmediata.
- Validar entradas con los schemas existentes.
- Mantener autenticación y autorización en servidor.
- No confiar en el cliente para confirmar pagos.
- Los webhooks deben verificar autenticidad e idempotencia.

## Verificación obligatoria antes de declarar una corrección terminada

```bash
npm ci
npm run verify:structure
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run security:audit
npm run build
```

No declarar el proyecto "verde" basándose solo en inspección estática. Deben comprobarse los resultados reales de GitHub Actions y Vercel.

## MCP y Agent Skills

El MCP de Supabase puede configurarse en modo read-only para auditorías:

```bash
codex mcp add supabase --url "https://mcp.supabase.com/mcp?project_ref=PROJECT_REF&read_only=true&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching"
codex mcp login supabase
```

Instalar las skills oficiales cuando estén disponibles:

```bash
npx skills add supabase/agent-skills
```

La skill de `supabase/server` no implica que la aplicación de Next.js deba migrarse a `@supabase/server`.

## Regla de cambios

Antes de modificar archivos, inspeccionar la implementación existente y reutilizar el módulo canónico. No crear una segunda implementación de una función ya existente.
