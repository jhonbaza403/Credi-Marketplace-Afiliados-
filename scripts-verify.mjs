import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const requiredFiles = [
  ".gitignore",
  ".nvmrc",
  ".vercelignore",
  ".env.example",
  "package.json",
  "package-lock.json",
  "next-env.d.ts",
  "next.config.ts",
  "eslint.config.mjs",
  "postcss.config.mjs",
  "playwright.config.ts",
  "vitest.config.ts",
  "tsconfig.json",
  "README.md",
  "SECURITY.md",
];

const requiredDirectories = [
  "src/app",
  "src/components",
  "src/config",
  "src/context",
  "src/features",
  "src/hooks",
  "src/i18n",
  "src/lib",
  "src/schemas",
  "src/services",
  "src/types",
  "supabase/migrations",
  "supabase/tests",
  "tests/unit",
  "tests/e2e",
];

const errors = [];

function checkFile(relativePath) {
  const target = path.resolve(root, relativePath);
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    errors.push(`Archivo faltante o inválido: ${relativePath}`);
    return false;
  }
  console.log(`✅ ${relativePath}`);
  return true;
}

function checkDirectory(relativePath) {
  const target = path.resolve(root, relativePath);
  if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
    errors.push(`Directorio faltante o inválido: ${relativePath}`);
    return false;
  }
  console.log(`✅ ${relativePath}/`);
  return true;
}

for (const file of requiredFiles) checkFile(file);
for (const directory of requiredDirectories) checkDirectory(directory);

const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
if (nodeMajor !== 22) {
  errors.push(`Node.js debe ser 22.x; versión detectada: ${process.versions.node}`);
} else {
  console.log(`✅ Node.js ${process.versions.node}`);
}

const nvmrc = fs.readFileSync(path.resolve(root, ".nvmrc"), "utf8").trim();
if (nvmrc !== "22") {
  errors.push(`.nvmrc debe declarar 22; valor detectado: ${nvmrc || "vacío"}`);
} else {
  console.log("✅ .nvmrc = 22");
}

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(root, "package.json"), "utf8"),
);

if (packageJson.engines?.node !== ">=22.0.0 <23.0.0") {
  errors.push("package.json debe declarar engines.node >=22.0.0 <23.0.0");
}

if (packageJson.engines?.npm !== ">=10.0.0 <11.0.0") {
  errors.push("package.json debe declarar engines.npm >=10.0.0 <11.0.0");
}

if (packageJson.dependencies?.next !== "16.3.4") {
  errors.push(`Next.js esperado: 16.3.4; detectado: ${packageJson.dependencies?.next ?? "ausente"}`);
}

if (packageJson.dependencies?.react !== "19.0.0") {
  errors.push(`React esperado: 19.0.0; detectado: ${packageJson.dependencies?.react ?? "ausente"}`);
}

const packageLock = JSON.parse(
  fs.readFileSync(path.resolve(root, "package-lock.json"), "utf8"),
);

if (packageLock.name !== packageJson.name) {
  errors.push("package-lock.json no coincide con package.json en name");
}

if (packageLock.version !== packageJson.version) {
  errors.push("package-lock.json no coincide con package.json en version");
}

if (errors.length > 0) {
  console.error("\n❌ Verificación estructural fallida:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("\n🚀 Estructura raíz, runtime y contratos principales verificados.");
