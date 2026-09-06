# Audit & Repair Notes — Credi Marketplace

## Normalización consolidada

1. **Runtime**: Node.js 24.x LTS y npm 11.x alineados en `.nvmrc`, `package.json`, CI/CD y documentación.
2. **Framework**: Next.js 16.3.4 con App Router y React 19.
3. **Bundler**: Turbopack es el comportamiento predeterminado de Next.js 16; se eliminó el script redundante `dev:turbo` y Playwright usa `npm run dev`.
4. **TypeScript**: proyecto configurado como TypeScript-only mediante `allowJs: false`.
5. **ESLint**: configuración Flat Config compatible con ESLint 9.
6. **Tailwind CSS**: Tailwind CSS 4 con `@tailwindcss/postcss`.
7. **Entorno**: `.env.example` es la plantilla canónica; las variables privadas permanecen server-only.
8. **Supabase**: clientes canónicos en `src/lib/supabase/` y flujo de sesión en `src/proxy.ts`.
9. **Playwright**: usa `PLAYWRIGHT_BASE_URL` y el comando canónico `npm run dev`.
10. **Vitest**: resolución del alias `@` y `setupFiles` basada en rutas ESM.
11. **Verificación estructural**: `scripts-verify.mjs` valida archivos críticos, directorios, Node.js 24.x, `.nvmrc`, engines, `packageManager` y lockfile v3.
12. **Seguridad de repositorio**: `.gitignore` reforzado para variables de entorno, artefactos, certificados y material privado.
13. **GitHub Actions**: workflows normalizados con `actions/checkout@v6` y `actions/setup-node@v6`; se eliminó la dependencia de la caché de npm para que el lockfile pueda validarse explícitamente antes de instalar.
14. **Lockfile**: `package-lock.json` debe regenerarse desde el manifiesto con npm 11 y mantenerse versionado en Git.

## Evidencia necesaria

La inspección estática no equivale a una validación de producción. La confirmación definitiva requiere ejecuciones reales de GitHub Actions y Vercel:

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

Mientras esas verificaciones no sean exitosas, el estado de producción permanece **NOT CONFIRMED**.
