// ==========================================================
// ARCHIVO:
// vitest.config.ts
//
// Credi Marketplace
//
// Configuración de Vitest
//
// Next.js 16
// React 19
// TypeScript
// Tailwind CSS 4
// ==========================================================

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ==========================================================
// RUTA DEL PROYECTO
// ==========================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================================
// CONFIGURACIÓN
// ==========================================================

export default defineConfig({
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
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // --------------------------------------------------------
  // TEST
  // --------------------------------------------------------

  test: {
    environment: "jsdom",

    globals: true,

    setupFiles: [
      "./tests/unit/setup.ts",
    ],

    include: [
      "tests/unit/**/*.test.{ts,tsx}",
    ],

    exclude: [
      "node_modules",
      ".git",
      ".next",
      "coverage",
      "dist",
    ],

    // ------------------------------------------------------
    // Limpieza entre pruebas
    // ------------------------------------------------------

    clearMocks: true,
    mockReset: true,
    restoreMocks: true,

    // ------------------------------------------------------
    // Reporte
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

      reportsDirectory: "./coverage",

      exclude: [
        "**/*.d.ts",
        "**/index.ts",
        "**/index.tsx",
        "**/*.config.{ts,js,mjs,cjs}",
        "**/next-env.d.ts",
        "**/.next/**",
        "**/node_modules/**",
      ],

      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
});
