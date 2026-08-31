# Credi Marketplace — Auditoría técnica

## Resultado

La base fuente fue reconstruida desde el archivo recibido, corrigiendo incompatibilidades de Next.js 16/Tailwind 4, errores sintácticos detectados por TypeScript, rutas inconsistentes, configuración de Supabase y estructura de CI.

## Correcciones principales

- Node.js fijado en 24.20.0 LTS mediante `.nvmrc`.
- npm 11.x requerido mediante `packageManager` y `engines`.
- Next.js 16.3.3.
- React 19.2.8.
- TypeScript 7.0.2.
- Tailwind CSS 4.3.3 con configuración CSS-first.
- Eliminado `tailwind.config.ts` heredado de Tailwind 3.
- `postcss.config.mjs` preparado para `@tailwindcss/postcss`.
- `tsconfig.json` creado con alias `@/* -> src/*`.
- `next-env.d.ts` corregido.
- Eliminado `src/middleware.ts` duplicado; se conserva `src/proxy.ts` para Next.js 16.
- Corregida la clave Supabase del cliente: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Corregidas rutas de autenticación y redirects.
- Corregida validación de `DATABASE_URL` para no tratar una cadena PostgreSQL como URL HTTP.
- Añadidas páginas globales de loading, error, global-error, not-found, robots y sitemap.
- Añadido `admin` protegido mediante `requireAdmin()`.
- Añadidos Vitest y Playwright.
- Añadidos smoke test unitario y E2E inicial.
- CI ordenada como: install -> lint -> typecheck -> unit -> E2E -> build.
- Security workflow separado para `npm audit`.
- Deploy workflow convertido en gate para Vercel Git Integration; no se introduce OpenNext ni Vercel CLI innecesariamente.
- Eliminados fences Markdown y bloques de escritura que habían quedado incrustados dentro de archivos TypeScript/TSX.
- Corregidos varios archivos con errores sintácticos que impedían incluso el análisis de TypeScript.
- Estructura raíz preparada para que `package.json` esté directamente en la raíz del repositorio.

## Bloqueo pendiente

`package-lock.json` NO se incluye artificialmente.

El archivo recibido contenía únicamente una plantilla con `...`, por lo que no era un lockfile válido. El entorno de auditoría no dispone de acceso funcional al registry npm para resolver el árbol completo de dependencias con npm 11.

Un `package-lock.json` inventado o incompleto haría fallar `npm ci` y sería peor que no tenerlo.

Para producir el lockfile definitivo, con Node 24.20.0 y npm 11.x:

```bash
nvm use
npm install
npm ci
```

Después de `npm install`, el `package-lock.json` generado debe ser incluido en el repositorio y el CI queda listo para utilizar `npm ci`.

## Vercel

La raíz del repositorio debe ser exactamente la carpeta que contiene:

- `package.json`
- `src/`
- `public/`
- `next.config.ts`
- `tsconfig.json`

No debe existir una carpeta contenedora adicional `credi-marketplace/credi-marketplace/`.

## Verificación local de sintaxis

Se ejecutó TypeScript contra la fuente disponible y se eliminaron los errores sintácticos. La comprobación completa de tipos, lint, tests y build requiere instalar las dependencias con Node 24/npm 11.
