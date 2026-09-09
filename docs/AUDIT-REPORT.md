# Audit Report — Credi Marketplace

- **Audit level**: High / Critical
- **Repository status**: Normalización de runtime y arquitectura aplicada; verificación dinámica pendiente hasta completar CI.
- **Runtime**: Node.js 24.x LTS
- **Package manager**: npm 11.x
- **Framework**: Next.js 16.3.4 / React 19.0.0
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Backend / Auth**: Supabase + `@supabase/ssr`
- **Testing**: Vitest + Testing Library + Playwright
- **Deployment**: Vercel

## Correcciones principales

- Se eliminó `src/utils/` como segunda implementación de utilidades; la capa canónica es `src/lib/utils/`.
- Se eliminó `src/lib/env.ts`; la fuente única de variables de entorno es `src/env.ts`.
- Se consolidó la configuración alrededor de `src/config/`.
- Se mantienen fachadas de compatibilidad solo donde existe código consumidor real.
- Se reforzó `scripts-verify.mjs` para Node 24, npm 11, packageManager y lockfile v3.
- Se normalizaron GitHub Actions con `actions/checkout@v6` y `actions/setup-node@v6`.
- Se eliminó la caché automática de npm de CI para que la validación del lockfile ocurra de forma explícita.
- Se fijó npm 11.19.1 para regeneración y validación reproducible del lockfile.
- Se añadió `expired` al enum canónico `public.order_status` de la migración 003.

## Estado de verificación

La auditoría estática y estructural no equivale a una validación de producción. La confirmación definitiva requiere ejecuciones reales de GitHub Actions y Vercel:

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

Hasta que todas las verificaciones requeridas y el despliegue correspondiente estén confirmados, **PRODUCTION BUILD = NOT CONFIRMED**.
