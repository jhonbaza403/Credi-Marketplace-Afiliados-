import fs from "node:fs";
import path from "node:path";

const requiredFiles = [
  "package.json",
  "next.config.ts",
  "tsconfig.json",
  "eslint.config.mjs",
  ".nvmrc",
];

let missing = 0;

for (const file of requiredFiles) {
  if (!fs.existsSync(path.resolve(process.cwd(), file))) {
    console.error(`❌ Archivo faltante: ${file}`);
    missing++;
  } else {
    console.log(`✅ ${file} verificado.`);
  }
}

if (missing > 0) {
  process.exit(1);
} else {
  console.log("🚀 Estructura del proyecto verificada con éxito.");
}
