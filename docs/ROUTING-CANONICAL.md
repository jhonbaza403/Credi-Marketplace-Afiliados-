# Routing canónico

Credi Marketplace usa una sola URL pública canónica en producción:

`https://credi-marketplace-afiliados.vercel.app/`

## Regla

Cada pathname debe tener una sola página física de Next.js. Las rutas heredadas deben ser redirects/re-writes, no páginas duplicadas dentro de grupos de rutas.

## Correcciones aplicadas

- Eliminada la página `src/app/(public)/jobs/page.tsx`, porque duplicaba `/jobs`.
- Eliminada la página `src/app/(public)/products/create/page.tsx`, porque duplicaba `/products/create` con la ruta heredada.
- Eliminada la página `src/app/(public)/seller/b2b/page.tsx`, porque duplicaba `/seller/b2b` con la ruta heredada.
- Se mantienen aliases heredados únicamente cuando redirigen a un destino canónico y no crean una segunda página de destino.

## Objetivo de producción

- Un solo host canónico.
- Sin páginas paralelas que resuelvan el mismo pathname.
- Sin rutas de compatibilidad que compitan con las páginas canónicas.
- SEO, Open Graph y enlaces internos apuntan al dominio canónico.

## Validación obligatoria

Antes de producción:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

El build de Next.js debe terminar sin errores de rutas duplicadas ni `Internal Server Error` generado por conflictos de App Router.
