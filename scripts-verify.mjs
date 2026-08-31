```javascript
// ==========================================================
// ARCHIVO:
// tests/verify-structure.mjs
//
// Credi Marketplace
//
// Verificación estructural del proyecto
//
// Node.js 24.x
// Next.js 16.3.3
// React 19.2.8
// TypeScript 7.0.2
// Tailwind CSS 4.3.3
// Supabase
// Vitest
// ==========================================================

import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

// ==========================================================
// RAÍZ DEL PROYECTO
// ==========================================================

const ROOT = process.cwd();

// ==========================================================
// ARCHIVOS OBLIGATORIOS
// ==========================================================

const requiredFiles = [
  // --------------------------------------------------------
  // Configuración raíz
  // --------------------------------------------------------

  "package.json",
  "package-lock.json",

  "next.config.ts",
  "tsconfig.json",

  "eslint.config.mjs",
  "postcss.config.mjs",

  ".nvmrc",
  ".gitignore",

  // --------------------------------------------------------
  // Next.js
  // --------------------------------------------------------

  "next-env.d.ts",

  "src/app/layout.tsx",
  "src/app/globals.css",

  // --------------------------------------------------------
  // Routing / Proxy
  // --------------------------------------------------------

  "src/proxy.ts",

  // --------------------------------------------------------
  // Autenticación
  // --------------------------------------------------------

  "src/lib/auth/guards.ts",

  // --------------------------------------------------------
  // Supabase
  // --------------------------------------------------------

  "supabase/config.toml",
  "supabase/migrations",

  // --------------------------------------------------------
  // Componentes principales
  // --------------------------------------------------------

  "src/components/admin/AdminDashboard.tsx",
  "src/components/dashboard/DashboardPage.tsx",

  // --------------------------------------------------------
  // Dashboard
  // --------------------------------------------------------

  "src/app/dashboard/page.tsx",
  "src/app/dashboard/admin/page.tsx",

  // --------------------------------------------------------
  // Administración
  // --------------------------------------------------------

  "src/app/admin/page.tsx",

  // --------------------------------------------------------
  // Pruebas
  // --------------------------------------------------------

  "vitest.config.ts",
  "tests/unit/setup.ts",
];

// ==========================================================
// DIRECTORIOS OBLIGATORIOS
// ==========================================================

const requiredDirectories = [
  "src",
  "src/app",
  "src/components",
  "src/components/admin",
  "src/components/dashboard",
  "src/lib",
  "src/lib/auth",
  "tests",
  "tests/unit",
  "supabase",
  "supabase/migrations",
];

// ==========================================================
// ARCHIVOS OPCIONALES RECOMENDADOS
// ==========================================================

const recommendedFiles = [
  ".env.example",

  "README.md",

  "src/lib/supabase/client.ts",
  "src/lib/supabase/server.ts",

  "src/context/AuthContext.tsx",

  "tests/unit",
];

// ==========================================================
// VALIDAR ARCHIVOS
// ==========================================================

const missingFiles = requiredFiles.filter(
  (file) => !existsSync(resolve(ROOT, file)),
);

// ==========================================================
// VALIDAR DIRECTORIOS
// ==========================================================

const missingDirectories = requiredDirectories.filter((directory) => {
  const target = resolve(ROOT, directory);

  if (!existsSync(target)) {
    return true;
  }

  try {
    return !statSync(target).isDirectory();
  } catch {
    return true;
  }
});

// ==========================================================
// ARCHIVOS RECOMENDADOS
// ==========================================================

const missingRecommended = recommendedFiles.filter(
  (file) => !existsSync(resolve(ROOT, file)),
);

// ==========================================================
// RESULTADO
// ==========================================================

console.log("");
console.log("==============================================");
console.log(" CREDI MARKETPLACE");
console.log(" VERIFICACIÓN ESTRUCTURAL");
console.log("==============================================");
console.log("");

// ==========================================================
// ERRORES
// ==========================================================

if (missingFiles.length > 0 || missingDirectories.length > 0) {
  console.error("❌ Structural verification failed.");
  console.error("");

  if (missingFiles.length > 0) {
    console.error("Archivos obligatorios faltantes:");

    for (const file of missingFiles) {
      console.error(`  ✗ ${file}`);
    }

    console.error("");
  }

  if (missingDirectories.length > 0) {
    console.error("Directorios obligatorios faltantes:");

    for (const directory of missingDirectories) {
      console.error(`  ✗ ${directory}`);
    }

    console.error("");
  }

  process.exit(1);
}

// ==========================================================
// ARCHIVOS RECOMENDADOS
// ==========================================================

if (missingRecommended.length > 0) {
  console.warn("⚠️ Archivos recomendados no encontrados:");

  for (const file of missingRecommended) {
    console.warn(`  ! ${file}`);
  }

  console.warn("");
}

// ==========================================================
// ÉXITO
// ==========================================================

console.log("✓ Archivos obligatorios: OK");
console.log("✓ Directorios obligatorios: OK");

if (missingRecommended.length === 0) {
  console.log("✓ Archivos recomendados: OK");
} else {
  console.log(
    `⚠️ Archivos recomendados pendientes: ${missingRecommended.length}`,
  );
}

console.log("");
console.log("==============================================");
console.log(" VERIFICACIÓN COMPLETADA");
console.log("==============================================");
console.log("");
console.log("Credi Marketplace structural verification passed.");
console.log("");
```
