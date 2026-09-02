// ==========================================================
// ARCHIVO:
// playwright.config.ts
//
// Credi Marketplace
//
// Pruebas End-to-End
//
// Next.js 16.3.3
// React 19.2.8
// TypeScript
// Playwright
// ==========================================================

import { defineConfig, devices } from "@playwright/test";

// ==========================================================
// CONSTANTES
// ==========================================================

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  "http://127.0.0.1:3000";

const isCI = Boolean(process.env.CI);

// ==========================================================
// CONFIGURACIÓN
// ==========================================================

export default defineConfig({
  // --------------------------------------------------------
  // Directorio de pruebas
  // --------------------------------------------------------

  testDir: "./tests/e2e",

  // --------------------------------------------------------
  // Ejecución
  // --------------------------------------------------------

  fullyParallel: true,

  forbidOnly: isCI,

  retries: isCI ? 2 : 0,

  workers: isCI ? 1 : undefined,

  // --------------------------------------------------------
  // Timeout
  // --------------------------------------------------------

  timeout: 30_000,

  expect: {
    timeout: 10_000,
  },

  // --------------------------------------------------------
  // Reportes
  // --------------------------------------------------------

  reporter: isCI
    ? [
        ["line"],
        ["github"],
      ]
    : [
        ["list"],
        ["html", { open: "never" }],
      ],

  // --------------------------------------------------------
  // Configuración general de los tests
  // --------------------------------------------------------

  use: {
    baseURL,

    actionTimeout: 15_000,

    navigationTimeout: 30_000,

    trace: "retain-on-failure",

    screenshot: "only-on-failure",

    video: "retain-on-failure",

    // Evita depender de una ubicación gráfica específica.
    colorScheme: "light",

    // Permite identificar fácilmente las pruebas.
    testIdAttribute: "data-testid",
  },

  // --------------------------------------------------------
  // Navegadores
  // --------------------------------------------------------

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },

    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
      },
    },

    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
      },
    },
  ],

  // --------------------------------------------------------
  // Servidor Next.js
  // --------------------------------------------------------

  webServer: {
    command: "npm run dev",

    url: baseURL,

    reuseExistingServer: !isCI,

    timeout: 120_000,

    stdout: "pipe",

    stderr: "pipe",
  },

  // --------------------------------------------------------
  // Directorio de resultados
  // --------------------------------------------------------

  outputDir: "./test-results",
});
