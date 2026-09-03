# Credi Marketplace

Plataforma de marketplace orientada a producción para comercio electrónico, vendedores, afiliados, operaciones B2B, servicios, pagos y administración.

La aplicación está construida con:

- **Next.js 16.3.4 App Router**
- **React 19.0.0**
- **TypeScript 5.6.x**
- **Tailwind CSS 4**
- **Supabase**
- **Vercel**
- **Vitest**
- **Playwright**

El proyecto sigue principios de seguridad server-side, mínimo privilegio, validación de entradas, Row Level Security (RLS), idempotencia y defensa en profundidad.

## Runtime

Las versiones objetivo están alineadas con `.nvmrc`, `package.json` y `package-lock.json`:

| Tecnología | Versión |
| :--- | :--- |
| **Node.js** | `22.x` LTS |
| **npm** | `10.x` |
| **Next.js** | `16.3.4` |
| **React** | `19.0.0` |
| **React DOM** | `19.0.0` |
| **TypeScript** | `5.6.x` |
| **Tailwind CSS** | `4.x` |

## Arquitectura

Credi Marketplace utiliza Next.js App Router y separa presentación, dominios, casos de uso e infraestructura.

```text
Browser
   │
   ▼
Next.js App Router
   │
   ├── Server Components
   ├── Client Components
   ├── Route Handlers / Server Actions
   ├── Authentication
   └── Authorization
          │
          ▼
      Services / Features
          │
          ▼
          Lib
          │
          ▼
       Supabase
          │
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

Los componentes de interfaz no acceden directamente a la base de datos ni a credenciales privilegiadas.

## Variables de entorno

La plantilla canónica es `.env.example`.

Variables públicas:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_NAME
NEXT_PUBLIC_DEFAULT_LOCALE
NEXT_PUBLIC_DEFAULT_CURRENCY
NEXT_PUBLIC_DEFAULT_COUNTRY
NEXT_PUBLIC_ENV
```

Variables server-only:

```text
SUPABASE_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
GEMINI_API_KEY
```

Nunca expongas secretos mediante variables con prefijo `NEXT_PUBLIC_`.

## Instalación

```bash
npm ci
```

## Desarrollo

```bash
npm run dev:turbo
```

## Verificación

```bash
npm run verify:structure
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run security:audit
npm run build
```

La presencia de un archivo de configuración o una inspección estática no demuestra por sí sola que el build de producción haya pasado.

## Vercel

El proyecto está preparado para Vercel con Node.js 22.x, npm 10.x y `package-lock.json` como lockfile reproducible.

No se utiliza OpenNext ni un runtime alternativo de despliegue.

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
```

## Estado de verificación

El estado real de build debe actualizarse únicamente después de ejecutar las comprobaciones en un entorno con dependencias instaladas. Consulta `BUILD-VERIFICATION.md` para el contrato de verificación.
