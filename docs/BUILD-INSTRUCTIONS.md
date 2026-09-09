# Credi Marketplace — verificación local y Vercel

## Requisitos

- Node.js 24.x LTS.
- npm 11.x.
- Acceso a las variables de entorno necesarias para Supabase y servicios externos.

La versión de Node debe coincidir con `.nvmrc` y con `engines` de `package.json`.

## Instalación limpia

```bash
rm -rf node_modules .next
npm ci
```

En Windows PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules,.next -ErrorAction SilentlyContinue
npm ci
```

## Variables de entorno

Copia `.env.example` a `.env.local` y completa únicamente los valores necesarios. Nunca confirmes secretos reales al repositorio.

```bash
cp .env.example .env.local
```

## Verificaciones

```bash
npm run verify:structure
npm run typecheck
npm run lint
npm run test
npm run security:audit
npm run build
```

Para una validación completa, incluyendo E2E:

```bash
npm run check:all
```

## Desarrollo

```bash
npm run dev
```

Next.js 16 usa Turbopack de forma predeterminada para `next dev` y `next build`; no se mantiene un comando alternativo para activar el bundler manualmente.

## Vercel

El despliegue está alineado con Node.js 24.x, npm 11.x y `package-lock.json`.

No subas `.env.local`, credenciales, claves privadas ni archivos generados de desarrollo.

Vercel debe trabajar con el lockfile versionado en el repositorio para mantener instalaciones reproducibles.
