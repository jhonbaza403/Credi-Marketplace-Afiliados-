# Credi Marketplace — Build Verification

## Estado

Este documento registra criterios de verificación para la configuración y el árbol fuente del proyecto.

> Una comprobación estática o de estructura no constituye una prueba de build de producción. El build real debe completarse con `npm run build`.

## Runtime objetivo

| Componente | Objetivo |
|---|---|
| Node.js | 22.x LTS |
| npm | 10.x |
| Next.js | 16.3.4 |
| React | 19.0.0 |
| TypeScript | 5.6.x |
| Tailwind CSS | 4.x |
| Backend/Auth | Supabase |
| Deployment | Vercel |

La configuración debe permanecer coherente con `.nvmrc`, `package.json` y `package-lock.json`.

## Verificación estructural

Ejecutar:

```bash
npm run verify:structure
```

El script comprueba archivos críticos, directorios esenciales, Node.js 22.x, `.nvmrc`, engines, versiones base y coherencia básica del lockfile.

## Calidad estática

```bash
npm run lint
npm run typecheck
```

El proyecto está configurado como TypeScript-only mediante `allowJs: false`.

## Tests

```bash
npm run test
npm run test:e2e
```

Vitest usa `tests/unit` y `tests/integracion`. Playwright usa `tests/e2e` y `PLAYWRIGHT_BASE_URL`, con `next dev --turbo` para el servidor local.

## Supabase

El cliente de navegador debe usar únicamente:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Las credenciales privilegiadas deben permanecer server-only y nunca exponerse mediante variables `NEXT_PUBLIC_*`.

Las operaciones protegidas deben conservar autorización server-side y políticas RLS en Supabase.

## Entorno

La plantilla canónica es:

```text
.env.example
```

La carga real se realiza mediante las variables configuradas para desarrollo, CI o Vercel. No se versionan secretos.

## Seguridad de administración

Las rutas administrativas deben permanecer protegidas en servidor mediante los guards correspondientes. La interfaz de usuario no constituye un control de seguridad.

## Build de producción

El comando definitivo es:

```bash
npm run build
```

Un build válido debe terminar sin errores de Next.js, TypeScript, resolución de módulos, configuración o compilación.

## Secuencia recomendada

```text
npm ci
   ↓
npm run verify:structure
   ↓
npm run lint
   ↓
npm run typecheck
   ↓
npm run test
   ↓
npm run test:e2e
   ↓
npm run security:audit
   ↓
npm run build
```

## Estado de producción

```text
STRUCTURE VERIFICATION   NOT YET EXECUTED IN THIS COMMIT
LINT                     NOT YET EXECUTED IN THIS COMMIT
TYPECHECK                NOT YET EXECUTED IN THIS COMMIT
UNIT TESTS               NOT YET EXECUTED IN THIS COMMIT
E2E TESTS                NOT YET EXECUTED IN THIS COMMIT
SECURITY AUDIT           NOT YET EXECUTED IN THIS COMMIT
PRODUCTION BUILD         NOT CONFIRMED
```

No se debe cambiar `PRODUCTION BUILD` a `PASS` hasta ejecutar realmente `npm run build` y verificar un resultado exitoso.
