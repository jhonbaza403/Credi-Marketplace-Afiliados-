# Credi Marketplace

Plataforma de marketplace orientada a producción para comercio electrónico, vendedores, afiliados empresariales, ofertas, servicios, operaciones B2B, pagos y distribución de publicaciones en redes sociales.

## Stack canónico

- **Next.js 16.3.x App Router**
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Node.js 22.x / npm 10.x**
- **Supabase**: PostgreSQL, Auth, RLS, Storage y funciones
- **Vercel**
- **Vitest + Playwright**

No se utiliza Pages Router, OpenNext ni un backend .NET como parte de la aplicación principal.

## Arquitectura

```text
Browser
   │
   ▼
Next.js App Router
   │
   ├── Server Components
   ├── Client Components
   ├── Route Handlers / Server Actions
   ├── Auth / Authorization
   │
   ▼
Features / Services
   │
   ▼
Supabase clients
   ├── Browser Client
   ├── Server Client
   └── Admin Client (server-only)
   │
   ▼
Supabase
   ├── Auth
   ├── PostgreSQL
   ├── RLS
   ├── RPC
   └── Storage
```

### Regla de dependencias

```text
app
 ↓
features / components
 ↓
hooks / context
 ↓
services
 ↓
lib
 ↓
Supabase / infraestructura
```

Los componentes no acceden directamente a PostgreSQL ni a credenciales privilegiadas.

## Supabase en Next.js

Los clientes canónicos están en:

```text
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/lib/supabase/admin.ts
src/proxy.ts
```

La aplicación usa `@supabase/ssr` para el flujo SSR basado en cookies y `@supabase/supabase-js`. No se debe crear `src/utils/supabase/` ni duplicar clientes.

### Variables públicas

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

### Variables server-only

```text
SUPABASE_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
GEMINI_API_KEY
```

Nunca incluir valores secretos en el repositorio, README, logs o código cliente. Si una clave `sb_secret_*`, service-role key, contraseña PostgreSQL o token OAuth queda expuesto, debe rotarse inmediatamente.

## Supabase CLI

Para un entorno local correctamente autenticado:

```bash
supabase login
supabase init
supabase link --project-ref PROJECT_REF
```

Las migraciones y pruebas SQL del proyecto están en:

```text
supabase/migrations/
supabase/tests/
supabase/functions/
```

Antes de modificar enums, constraints, triggers o funciones, revisar el orden completo de las migraciones.

## Data API y RLS

La Data API de Supabase puede utilizarse para tablas que estén explícitamente diseñadas para ello. Toda tabla expuesta debe tener una política RLS apropiada y permisos mínimos.

El ejemplo `instruments` de la documentación de Supabase es un **quickstart**, no una tabla de producción de Credi Marketplace. No se añade al esquema productivo solo por seguir el tutorial.

Ejemplo aislado del quickstart, si se necesita para una prueba:

```sql
create table instruments (
  id bigint primary key generated always as identity,
  name text not null
);

insert into instruments (name)
values ('violin'), ('viola'), ('cello');

alter table public.instruments enable row level security;

grant select on public.instruments to anon;

create policy "public can read instruments"
on public.instruments
for select
to anon
using (true);
```

## Conexión PostgreSQL

Supabase proporciona una conexión PostgreSQL directa/pooled para herramientas que realmente necesiten acceso SQL. Los parámetros del proyecto no deben convertirse en una cadena con contraseña dentro del repositorio.

Para Next.js, el acceso normal debe pasar por los clientes Supabase canónicos, RPC o servicios server-side. Drizzle es opcional y no debe introducirse como segundo ORM sin una decisión arquitectónica explícita.

Las instrucciones de `Npgsql`, `appsettings.json` y `dotnet add package` corresponden únicamente a una aplicación .NET independiente; no forman parte del stack principal de Credi Marketplace.

## Marketplace y ofertas

Credi Marketplace permite publicaciones de productos, bienes, servicios y otros clasificados permitidos por la política de la plataforma.

```text
Publicación
   │
   ├── Marketplace
   └── Oferta
```

Una oferta es distinta de una publicación patrocinada o un anuncio.

## Afiliación empresarial

Credi Marketplace puede utilizar sus propias cuentas y programas de afiliación empresarial con proveedores externos. Eso es independiente de cualquier eventual programa interno de recompensas a vendedores o creadores.

No asumir que una comisión externa de Amazon, SHEIN, AliExpress, Alibaba u otro proveedor se reparte automáticamente entre usuarios. Cada programa debe respetar sus contratos, disclosures, enlaces especiales y reglas de atribución.

## Publicación social

La publicación original pertenece a Credi Marketplace y puede distribuirse a canales autorizados:

```text
                    CREDI MARKETPLACE
                           │
                     PUBLICACIÓN
                           │
              ┌────────────┴────────────┐
              │                         │
          Marketplace                 Oferta
              │                         │
              └────────────┬────────────┘
                           │
                    Content Composer
                           │
                    Social Queue
                           │
       ┌──────────┬────────┼────────┬──────────┐
       ↓          ↓        ↓        ↓          ↓
    TikTok     YouTube Instagram Facebook   Threads
       │
   TikTok Shop
       │
 Pinterest / LinkedIn / otros
```

La infraestructura de publicaciones sociales no implica que todas las plataformas permitan publicación automática sin requisitos adicionales. Cada proveedor puede exigir OAuth, scopes, aplicaciones registradas, auditoría, límites, formatos o permisos comerciales específicos.

Nunca almacenar tokens OAuth en texto plano.

## Agent Skills y MCP de Supabase

Instalar las skills oficiales cuando se trabaje con agentes de código:

```bash
npx skills add supabase/agent-skills
```

La skill `supabase/server` puede instalarse como conocimiento adicional cuando sea necesaria, pero no implica migrar el cliente SSR de Next.js desde `@supabase/ssr`.

Para auditorías se recomienda conectar el MCP de Supabase en modo read-only y limitarlo al proyecto correspondiente:

```bash
codex mcp add supabase --url "https://mcp.supabase.com/mcp?project_ref=PROJECT_REF&read_only=true&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching"
codex mcp login supabase
```

Comprobar posteriormente la conexión desde el cliente de Codex. No incluir tokens de autenticación ni credenciales del MCP en el repositorio.

## Instalación

```bash
npm ci
```

## Desarrollo

```bash
npm run dev:turbo
```

## Verificación completa

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

No utilizar `npm audit fix --force` de forma ciega. Primero se debe identificar el árbol vulnerable y actualizar dependencias de forma controlada, manteniendo compatibilidad con Next.js, Vite, Vitest y Node.js objetivo.

## Vercel

El proyecto está preparado para Vercel con Node.js 22.x y npm 10.x.

Las variables públicas mínimas para Supabase son:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Deben estar configuradas en los entornos de Vercel que correspondan. Las credenciales secretas nunca se colocan en el código cliente.

## Estructura principal

```text
src/
├── app/
├── components/
├── config/
├── context/
├── features/
├── hooks/
├── i18n/
├── lib/
├── schemas/
├── services/
├── types/
├── env.ts
└── proxy.ts

supabase/
├── migrations/
├── tests/
└── functions/

tests/
├── unit/
├── e2e/
└── integracion/

AGENTS.md
```

## Reglas para agentes de código

Consultar `AGENTS.md` antes de modificar el proyecto. Allí están las reglas canónicas para Supabase, seguridad, marketplace, publicación social, MCP, Agent Skills y verificación.

## Estado de verificación

El estado real de CI y Vercel debe determinarse mediante ejecuciones reales. La existencia de archivos, una inspección estática o una configuración local no demuestra que el build de producción haya pasado.
