// ==========================================================
// ARCHIVO: eslint.config.mjs
// Credi Marketplace - ESLint 9 Flat Config
// ==========================================================

import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // ========================================================
  // CONFIGURACIÓN OFICIAL DE NEXT.JS
  // ========================================================
  ...compat.extends("next/core-web-vitals"),

  // ========================================================
  // ARCHIVOS Y DIRECTORIOS IGNORADOS
  // ========================================================
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "dist/**",
      "build/**",
      ".vercel/**",
      "*.log",
      "**/*.log",
      ".env",
      ".env.*",
      "!.env.example",
      ".cache/**",
      ".turbo/**",
      "supabase/.branches/**",
      "supabase/.temp/**",
    ],
  },

  // ========================================================
  // REGLAS DEL PROYECTO
  // ========================================================
  {
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-unused-vars": "off",
      "react/jsx-no-target-blank": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-unreachable": "error",
      "no-async-promise-executor": "error",
      "no-var": "error",
      "prefer-const": "error",
    },
  },

  // ========================================================
  // ARCHIVOS DE CONFIGURACIÓN NODE
  // ========================================================
  {
    files: ["*.config.js", "*.config.mjs", "*.config.cjs", "*.config.ts"],
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

export default eslintConfig;
