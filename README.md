# Credi Marketplace

Plataforma de marketplace orientada a producción para comercio electrónico, vendedores, afiliados empresariales, ofertas, servicios, operaciones B2B, pagos y distribución de publicaciones en redes sociales.

## Identidad y arquitectura canónicas de Credi

Credi Marketplace mantiene una arquitectura tecnológica propia. Las capacidades de inteligencia se presentan bajo nomenclatura Credi y no deben utilizar marcas de terceros como identidad funcional del producto.

### Capa transversal

**CREDI INTELLIGENCE** es el cerebro transversal de la plataforma. Orquesta señales, decisiones, modelos, automatizaciones y auditoría sin sustituir los módulos de dominio que ya existen.

### Módulos oficiales

| Módulo | Función |
| --- | --- |
| **CREDI INTELLIGENCE** | Orquestación transversal de inteligencia y decisiones |
| **CREDI-CREDIT AI** | Inteligencia crediticia y evaluación de riesgo |
| **CREDI-SUPPLY AI** | Abastecimiento e incorporación inteligente de fuentes comerciales autorizadas |
| **CREDI-CATALOG AI** | Generación, normalización y optimización de catálogos |
| **CREDI-FLEX AI** | Inteligencia logística y asignación de entregas |
| **CREDI-LOCKER** | Red de casilleros inteligentes y puntos de entrega |
| **CREDI-ESCROW** | Custodia y liberación controlada de fondos |
| **CREDI-LIVE** | Comercio en vivo |
| **CREDI-AFFILIATE AI** | Afiliación, atribución y comisiones inteligentes |
| **CREDI-REPUTATION** | Reputación comercial y señales de confianza |
| **CREDI-AUTOMATION** | Automatización y agentes gobernados |

```text
                         CREDI MARKETPLACE
                                  │
                         CREDI INTELLIGENCE
                                  │
          ┌─────────────┬────────┼────────┬─────────────┐
          │             │        │        │             │
       CREDIT        SUPPLY   CATALOG    FLEX          LIVE
          │             │        │        │             │
          └─────────────┴────────┼────────┴─────────────┘
                                  │
                    REPUTATION / ESCROW / PAYMENTS
                                  │
                    AFFILIATE / AUTOMATION / LOCKER
```

### Regla de abastecimiento

**CREDI-SUPPLY AI no depende de una marca concreta.** Debe admitir múltiples fuentes comerciales autorizadas, cada una mediante su propio adaptador, contrato, política de datos, condiciones de atribución y controles de cumplimiento.

`Dropshipping` es una **modalidad comercial soportada por CREDI-SUPPLY AI**, no el nombre principal del producto ni de la arquitectura.

### Regla de fuente de verdad

El producto, catálogo, relación comercial, oferta, afiliación, reputación y estado transaccional pertenecen a Credi. Las integraciones externas son fuentes o canales autorizados; no sustituyen la identidad ni el modelo de dominio de Credi.

## Stack canónico

- **Next.js 16.3.x App Router**
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Node.js 24.x LTS / npm 11.x**
- **Supabase**: PostgreSQL, Auth, RLS, Storage y funciones
- **Vercel**
- **Stripe** para pagos cuando corresponda, sujeto a configuración de entorno y webhooks verificados
- **Vitest + Playwright**

Node.js 24 es el runtime objetivo del proyecto. Next.js 16 usa Turbopack de forma predeterminada para desarrollo y build, por lo que no se mantiene un script duplicado para activar Turbopack manualmente.

No se utiliza Pages Router ni un backend .NET como parte de la aplicación principal. OpenNext no forma parte del despliegue de Vercel.

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
   └── Auth / Authorization
   │
   ▼
Features / Services
   │
   ├── Credi Intelligence modules
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

## CREDI Intelligence en Supabase

La base de datos contiene una capa transversal para registrar módulos, eventos de inteligencia y decisiones gobernadas:

```text
public.credi_intelligence_modules
public.credi_intelligence_events
public.credi_intelligence_decisions
```

La migración inicial es:

```text
supabase/migrations/credi_intelligence_core.sql
```

`credi_intelligence_modules` actúa como registro canónico de capacidades. `credi_intelligence_events` permite auditar señales y resultados. `credi_intelligence_decisions` conserva decisiones versionadas con puntuación, confianza, racional y estado.

Las tablas tienen RLS habilitado y no deben recibir acceso público por defecto. Las operaciones privilegiadas deben ejecutarse server-side mediante los clientes y servicios canónicos.

La capa transversal no reemplaza las tablas de dominio ya existentes, como `products`, `listings`, `inventory`, `inventory_forecasts`, `affiliate_attributions`, `reputation_profiles`, `orders`, `stores`, `business_workspaces` y demás componentes del marketplace. La función de CREDI Intelligence es coordinarlas y aportar inteligencia gobernada sobre ellas.

## Supabase en Next.js

Los clientes canónicos están en:

```text
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/lib/supabase/admin.ts
src/proxy.ts
```

La aplicación usa `@supabase/ssr` para SSR basado en cookies y `@supabase/supabase-js` para el acceso al servicio. No se debe crear `src/utils/supabase/` ni duplicar clientes.

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
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

Nunca incluir valores secretos en el repositorio, README, logs o código cliente. Las claves privilegiadas y tokens OAuth deben permanecer exclusivamente del lado servidor.

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

El ejemplo `instruments` de la documentación de Supabase es un quickstart, no una tabla de producción de Credi Marketplace. No se añade al esquema productivo solo por seguir el tutorial.

## Conexión PostgreSQL

Supabase proporciona conexión PostgreSQL directa/pooled para herramientas que realmente necesiten acceso SQL. Los parámetros del proyecto no deben convertirse en una cadena con contraseña dentro del repositorio.

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
Listing / Offer
      ↓
Content Composer
      ↓
Social Queue
      ↓
Adapter/API por plataforma
      ↓
Canales autorizados
```

La infraestructura social no implica que todas las plataformas permitan publicación automática sin requisitos adicionales. Cada proveedor puede exigir OAuth, scopes, aplicaciones registradas, auditoría, límites, formatos o permisos comerciales específicos.

Nunca almacenar tokens OAuth en texto plano.

## Monetización freemium y planes comerciales

Credi Marketplace utiliza un modelo de entrada gratuita: el acceso esencial al marketplace y a la presencia social no depende de una suscripción. La monetización se construye alrededor de capacidades opcionales para usuarios y negocios que necesiten mayor escala.

El catálogo comercial está definido por la migración:

```text
supabase/migrations/020_commercial_plans.sql
```

Y la lógica pública de planes por:

```text
src/lib/billing/plans.ts
src/app/pricing/page.tsx
src/app/api/billing/subscription/route.ts
```

Planes iniciales:

| Plan | Modelo | Precio base | Objetivo |
| --- | --- | ---: | --- |
| **Free** | Gratis | $0 | Comunidad, marketplace y afiliación básica |
| **Creator** | Suscripción opcional | $9/mes | Creadores, afiliados y vendedores independientes |
| **Business** | Suscripción opcional | $29/mes | Tiendas y negocios |
| **Enterprise** | Suscripción opcional | $99/mes | Empresas, equipos, API y automatización |

El precio y los límites viven en Supabase y pueden modificarse sin cambiar el código de la interfaz. Las suscripciones incluyen estado, período de facturación, proveedor, identificadores externos y bitácora de eventos para soportar integración futura con el proveedor de pagos elegido.

La plataforma no debe activar un plan de pago únicamente por una acción del navegador. La activación de suscripciones pagadas debe quedar condicionada a una confirmación server-side verificable del proveedor de pagos y a controles de idempotencia.

La página pública de planes está disponible en:

```text
/pricing
```

## Agent Skills y MCP de Supabase

Instalar las skills oficiales cuando se trabaje con agentes de código:

```bash
npx skills add supabase/agent-skills
```

La skill `supabase/server` puede instalarse como conocimiento adicional cuando sea necesaria, pero no implica migrar el cliente SSR de Next.js desde `@supabase/ssr`.
