import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const failures = [];
const checks = [];

function readRequired(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function assert(condition, message) {
  checks.push({ message, passed: Boolean(condition) });
  if (!condition) failures.push(message);
}

const packageText = readRequired("package.json");
const workerText = readRequired("wrangler.jsonc");
const openNextText = readRequired("open-next.config.ts");
const ci = readRequired(".github/workflows/ci.yml");
const deploy = readRequired(".github/workflows/deploy.yml");
const preview = readRequired(".github/workflows/preview-gate.yml");
const security = readRequired(".github/workflows/security.yml");
const productionE2E = readRequired(".github/workflows/production-e2e.yml");

let pkg = {};
let worker = {};
try { pkg = JSON.parse(packageText); } catch { failures.push("package.json is not valid JSON"); }
try { worker = JSON.parse(workerText); } catch { failures.push("wrangler.jsonc must remain JSON-valid JSONC"); }

assert(worker.name === "credi-marketplace-afiliados", "Cloudflare Worker name must remain unique to Credi Marketplace");
assert(worker.main === ".open-next/worker.js", "Cloudflare Worker entrypoint must use the OpenNext build output");
assert(worker.workers_dev === true, "The isolated Credi Worker must use its own workers.dev hostname");
assert((worker.compatibility_flags ?? []).includes("nodejs_compat"), "Cloudflare must enable nodejs_compat for Next.js runtime compatibility");
assert(worker.vars?.NEXT_PUBLIC_APP_URL === "https://credi-marketplace-afiliados.bazajhon.workers.dev", "Canonical application URL must point to the dedicated Credi Workers hostname");
assert(worker.vars?.NEXT_PUBLIC_SUPABASE_URL === "https://fusnmvmveqdzmzohhlzm.supabase.co", "Cloudflare must target Credi's confirmed Supabase project");
assert(openNextText.includes("defineCloudflareConfig"), "OpenNext Cloudflare adapter configuration must be present");

for (const script of ["build", "build:cloudflare", "preview:cloudflare", "deploy:cloudflare", "cf-typegen", "audit:env", "audit:api", "audit:routes", "audit:platform", "security:audit", "test", "test:e2e"]) {
  assert(typeof pkg.scripts?.[script] === "string", `package.json must define npm script: ${script}`);
}
assert(pkg.devDependencies?.["@opennextjs/cloudflare"], "The pinned OpenNext Cloudflare adapter must be a development dependency");
assert(pkg.devDependencies?.wrangler, "Wrangler must be pinned as a project-local development dependency");
assert(!pkg.dependencies?.["@vercel/analytics"] && !pkg.dependencies?.["@vercel/speed-insights"], "Vercel-only telemetry packages must not be runtime dependencies");
assert(ci.includes("npm run build:cloudflare"), "CI must validate the Cloudflare Worker build");
assert(ci.includes("npm ci --dry-run --ignore-scripts --no-audit --no-fund"), "CI must validate the committed npm lockfile");
assert(!ci.includes("npm install --package-lock-only"), "CI must not silently regenerate the lockfile");
assert(ci.includes("npm run test:e2e") && ci.includes("npm run build"), "CI must keep browser E2E and Next.js build as hard gates");
assert(preview.includes("npm run build:cloudflare"), "Pull-request preview gate must build the Cloudflare-targeted application");
assert(preview.includes("wrangler"), "Pull-request preview gate must validate Wrangler configuration");
assert(deploy.includes("credi-marketplace.bazajhon.workers.dev") && deploy.includes("/api/health"), "Post-CI deployment gate must smoke-test the dedicated Cloudflare deployment");
assert(!deploy.toLowerCase().includes("vercel"), "Deployment gate must not depend on Vercel");
assert(productionE2E.includes("workflow_dispatch:"), "Production E2E must remain manually triggered");
for (const secret of ["E2E_BASE_URL", "E2E_OPERATION_ID", "E2E_LIVE_ROOM_ID", "E2E_STORAGE_STATE_JSON"]) {
  assert(productionE2E.includes(`secrets.${secret}`), `Production E2E must validate its required secret: ${secret}`);
}
assert(!security.includes("audit-360-credi-20260922"), "Security workflow must not trigger on an obsolete one-off audit branch");

const workflowsDir = path.join(ROOT, ".github", "workflows");
if (fs.existsSync(workflowsDir)) {
  const workflowFiles = fs.readdirSync(workflowsDir).filter((name) => /\.ya?ml$/i.test(name));
  for (const name of workflowFiles) {
    const content = fs.readFileSync(path.join(workflowsDir, name), "utf8");
    assert(!/\bnetlify\b/i.test(content), `Workflow ${name} must not call the retired Netlify integration`);
    assert(!/\bvercel\b/i.test(content), `Workflow ${name} must not require the retired Vercel integration`);
  }
}

console.log("=== Credi GitHub + Cloudflare Platform Contract ===");
console.log(`Checks run: ${checks.length}`);
console.log(`Passed: ${checks.filter((x) => x.passed).length}`);
console.log(`Failed: ${checks.filter((x) => !x.passed).length}`);
for (const failure of failures) console.error(`FAIL: ${failure}`);
if (failures.length) process.exit(1);
console.log("Cloudflare platform contract: PASSED");
