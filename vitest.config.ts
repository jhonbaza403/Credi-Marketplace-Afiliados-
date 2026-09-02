// ==========================================================
// ARCHIVO:
// vitest.config.ts
//
// Credi Marketplace
//
// Configuración de Vitest para pruebas unitarias
//
// Stack:
// - Next.js 16
// - React 19
// - TypeScript
// - Tailwind CSS 4
// - Supabase
// ==========================================================

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ==========================================================
// RUTAS
// ==========================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = __dirname;
const srcDir = path.resolve(rootDir, "src");
const testsDir = path.resolve(rootDir, "tests");

// ==========================================================
// CONFIGURACIÓN
// ==========================================================

export default defineConfig({
// --------------------------------------------------------
// Directorio raíz
// --------------------------------------------------------

root: rootDir,

// --------------------------------------------------------
// React / TSX
// --------------------------------------------------------

plugins: [
react(),
],

// --------------------------------------------------------
// Resolución de módulos
// --------------------------------------------------------

resolve: {
alias: {
"@": srcDir,
},
},

// --------------------------------------------------------
// TEST
// --------------------------------------------------------

test: {
// Entorno DOM para componentes React.
environment: "jsdom",

```
// Permite utilizar describe(), it(), expect(), etc.
// sin importarlos manualmente.
globals: true,

// ------------------------------------------------------
// Inicialización
// ------------------------------------------------------

setupFiles: [
  path.resolve(testsDir, "unit/setup.ts"),
],

// ------------------------------------------------------
// Archivos incluidos
// ------------------------------------------------------

include: [
  "tests/unit/**/*.test.ts",
  "tests/unit/**/*.test.tsx",
],

// ------------------------------------------------------
// Exclusiones
// ------------------------------------------------------

exclude: [
  "node_modules/**",
  ".git/**",
  ".next/**",
  ".vercel/**",
  "coverage/**",
  "dist/**",
  "build/**",
  "out/**",
  "playwright-report/**",
  "test-results/**",
],

// ------------------------------------------------------
// Aislamiento
// ------------------------------------------------------

isolate: true,

// ------------------------------------------------------
// Mocks
// ------------------------------------------------------

clearMocks: true,
mockReset: true,
restoreMocks: true,

// ------------------------------------------------------
// Reportes
// ------------------------------------------------------

reporters: [
  "default",
],

// ------------------------------------------------------
// Cobertura
// ------------------------------------------------------

coverage: {
  provider: "v8",

  reporter: [
    "text",
    "html",
    "lcov",
  ],

  reportsDirectory: path.resolve(
    rootDir,
    "coverage",
  ),

  // ----------------------------------------------------
  // Archivos excluidos de cobertura
  // ----------------------------------------------------

  exclude: [
    "**/*.d.ts",
    "**/index.ts",
    "**/index.tsx",

    // Configuración
    "**/*.config.{ts,js,mjs,cjs}",

    // Next.js
    "**/next-env.d.ts",
    "**/.next/**",

    // Dependencias
    "**/node_modules/**",

    // Tests
    "**/*.test.{ts,tsx}",
    "**/*.spec.{ts,tsx}",
    "tests/**",

    // Tipos / mocks
    "**/__mocks__/**",
    "**/*.types.ts",
    "**/*.types.tsx",
  ],

  // ----------------------------------------------------
  // Umbrales mínimos
  // ----------------------------------------------------

  thresholds: {
    lines: 70,
    functions: 70,
    branches: 60,
    statements: 70,
  },
},
```

},
});
