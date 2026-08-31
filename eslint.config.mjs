```javascript
// ==========================================================
// ARCHIVO:
// eslint.config.mjs
//
// Credi Marketplace
//
// ESLint Flat Config
// Next.js 16.3.3
// React 19.2.8
// TypeScript 7.0.2
// ==========================================================

import next from "eslint-config-next";

export default [
  // ========================================================
  // CONFIGURACIÓN OFICIAL DE NEXT.JS
  // ========================================================

  ...next,

  // ========================================================
  // ARCHIVOS Y DIRECTORIOS IGNORADOS
  // ========================================================

  {
    ignores: [
      // Next.js
      ".next/**",

      // Dependencias
      "node_modules/**",

      // Cobertura de pruebas
      "coverage/**",

      // Playwright
      "playwright-report/**",
      "test-results/**",

      // Archivos generados
      "dist/**",
      "build/**",

      // Vercel
      ".vercel/**",

      // Archivos temporales
      "*.log",
      "**/*.log",

      // Variables de entorno
      ".env",
      ".env.*",
      "!.env.example",

      // Archivos de caché
      ".cache/**",
      ".turbo/**",

      // Supabase generado localmente
      "supabase/.branches/**",
      "supabase/.temp/**",
    ],
  },

  // ========================================================
  // REGLAS DEL PROYECTO
  // ========================================================

  {
    files: [
      "**/*.js",
      "**/*.jsx",
      "**/*.ts",
      "**/*.tsx",
    ],

    rules: {
      // ----------------------------------------------------
      // Errores potenciales
      // ----------------------------------------------------

      "no-console": [
        "warn",
        {
          allow: [
            "warn",
            "error",
          ],
        },
      ],

      "no-debugger": "error",

      // ----------------------------------------------------
      // Variables
      // ----------------------------------------------------

      "no-unused-vars": "off",

      // ----------------------------------------------------
      // React
      // ----------------------------------------------------

      "react/jsx-no-target-blank": "error",

      // ----------------------------------------------------
      // Seguridad básica
      // ----------------------------------------------------

      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",

      // ----------------------------------------------------
      // Código problemático
      // ----------------------------------------------------

      "no-constant-condition": [
        "error",
        {
          checkLoops: false,
        },
      ],

      "no-unreachable": "error",

      // ----------------------------------------------------
      // Promesas
      // ----------------------------------------------------

      "no-async-promise-executor": "error",

      // ----------------------------------------------------
      // Variables
      // ----------------------------------------------------

      "no-var": "error",

      "prefer-const": "error",
    },
  },

  // ========================================================
  // ARCHIVOS DE CONFIGURACIÓN NODE
  // ========================================================

  {
    files: [
      "*.config.js",
      "*.config.mjs",
      "*.config.cjs",
      "*.config.ts",
    ],

    rules: {
      "no-console": "off",
    },
  },

  // ========================================================
  // ARCHIVOS DE TEST
  // ========================================================

  {
    files: [
      "tests/**/*.ts",
      "tests/**/*.tsx",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
    ],

    rules: {
      "no-console": "off",
    },
  },
];
```
