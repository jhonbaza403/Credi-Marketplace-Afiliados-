import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const required = [
  "package.json","package-lock.json",".nvmrc",".node-version","tsconfig.json",
  "next.config.ts","eslint.config.mjs","postcss.config.mjs","src/proxy.ts"
];

for (const file of required) {
  if (!fs.existsSync(path.join(ROOT,file))) throw new Error(`Required file missing: ${file}`);
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT,"package.json"),"utf8"));
const lock = JSON.parse(fs.readFileSync(path.join(ROOT,"package-lock.json"),"utf8"));
const nodeMajor = Number(process.versions.node.split(".")[0]);
const npmVersion = process.env.npm_config_user_agent?.match(/npm\/(\d+\.\d+\.\d+)/)?.[1] ?? "";

if (nodeMajor !== 24) throw new Error(`Node.js 24.x required; found ${process.versions.node}`);
if (pkg.packageManager !== "npm@11.19.1") throw new Error("packageManager must be npm@11.19.1");
if (pkg.engines?.node !== ">=24.0.0 <25.0.0") throw new Error("engines.node contract mismatch");
if (pkg.engines?.npm !== ">=11.0.0 <12.0.0") throw new Error("engines.npm contract mismatch");
if (lock.lockfileVersion !== 3) throw new Error("package-lock.json must use lockfileVersion 3");
if (lock.name !== pkg.name || lock.version !== pkg.version) throw new Error("package-lock.json metadata mismatch");
if (!fs.existsSync(path.join(ROOT,"src","app"))) throw new Error("src/app is missing");
if (fs.existsSync(path.join(ROOT,"src","middleware.ts"))) throw new Error("middleware.ts is forbidden; Next.js 16 uses proxy.ts");
if (fs.existsSync(path.join(ROOT,"middleware.ts"))) throw new Error("middleware.ts is forbidden; Next.js 16 uses proxy.ts");

const publicPlans = path.join(ROOT,"src","lib","billing","plans.ts");
if (fs.existsSync(publicPlans)) {
  const text = fs.readFileSync(publicPlans,"utf8");
  if (!text.includes("creator") || !text.includes("admin")) {
    throw new Error("Commercial plan policy must explicitly exclude creator/admin.");
  }
}

const forbiddenSecretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bsk_(?:live|test)_[A-Za-z0-9]+/,
  /\bghp_[A-Za-z0-9]{20,}/,
  /AIza[0-9A-Za-z_-]{20,}/,
];
const textExt = new Set([".ts",".tsx",".js",".jsx",".mjs",".cjs",".json",".yml",".yaml",".md",".sql",".env"]);
function walk(dir) {
  const out=[];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir,{withFileTypes:true})) {
    if (["node_modules",".next",".git"].includes(e.name)) continue;
    const f=path.join(dir,e.name);
    if(e.isDirectory()) out.push(...walk(f));
    else if(textExt.has(path.extname(e.name))) out.push(f);
  }
  return out;
}
for (const file of walk(ROOT)) {
  const rel=path.relative(ROOT,file);
  if (rel === ".env.example") continue;
  const body=fs.readFileSync(file,"utf8");
  for (const re of forbiddenSecretPatterns) {
    if (re.test(body)) throw new Error(`Potential secret pattern detected in ${rel}`);
  }
}
console.log("Repository structure and runtime contract: PASSED");
if (npmVersion) console.log(`npm user-agent: ${npmVersion}`);
