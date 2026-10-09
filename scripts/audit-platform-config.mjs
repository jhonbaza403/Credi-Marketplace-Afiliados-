import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const failures = [];
const checks = [];

function readRequired(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    failures.push(\`Missing required file: \${relativePath}\`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function assert(condition, message) {
  checks.push({ message, passed: Boolean(condition) });
  if (!condition) failures.push(message);
}

const packageText = readRequired("package.json");
const vercelText = readRequired("vercel.json");
const ci = readRequired(".github/workflows/ci.yml");
const deploy = readRequired(".github/workflows/deploy.yml");
const preview = readRequired(".github/workflows/preview-gate.yml");
const security = readRequired(".github/workflows/security.yml");
const productionE2E = readRequired(".github/workflows/production-e2e.yml");
const admin = readRequired(".github/workflows/vercel-platform-admin.yml");

let pkg = {};
let vercel = {};
try { pkg = JSON.parse(packageText); } catch { failures.push("package.json is not valid JSON"); }
try { vercel = JSON.parse(vercelText); } catch { failures.push("vercel.json is not valid JSON"); }

const requiredWorkflowFiles = [
  ".github/workflows/ci.yml",
  ".github/workflows/deploy.yml",
  ".github/workflows/preview-gate.yml",
  ".github/workflows/production-e2e.yml",
  ".github/workflows/secrets.yml",
  ".github/workflows/security.yml",
  ".github/workflows/codeql.yml",
  ".github/workflows/dependency-review.yml",
  ".github/workflows/vercel-platform-admin.yml",
];
for (const file of requiredWorkflowFiles) readRequired(file);

assert(vercel.framework === "nextjs", "Vercel framework must remain nextjs");
assert(vercel.installCommand === "npm ci", "Vercel install command must use the lockfile via npm ci");
assert(vercel.buildCommand === "npm run build", "Vercel build command must call the canonical build script");
assert(vercel.ignoreCommand === "node scripts/vercel-ignore-build.mjs", "Vercel ignoreCommand must reference the tracked ignore script");

for (const script of ["build", "audit:env", "audit:api", "audit:routes", "audit:platform", "security:audit", "test", "test:e2e"]) {
  assert(typeof pkg.scripts?.[script] === "string", \`package.json must define npm script: \${script}\`);
}
assert(ci.includes("npm run audit:platform"), "CI must execute the GitHub/Vercel platform contract audit");
assert(ci.includes("npm ci --dry-run --ignore-scripts --no-audit --no-fund"), "CI must validate the committed lockfile without regenerating it");
assert(!ci.includes("npm install --package-lock-only"), "CI must not regenerate the lockfile before validating it");
assert(ci.includes("npm run test:e2e") && ci.includes("npm run build"), "CI must keep browser E2E and production build as hard gates");

assert(deploy.includes('workflows:\n      - "Credi Marketplace CI"'), "Deployment validation must follow the canonical Credi Marketplace CI workflow");
assert(deploy.includes("Vercel – credi-marketplace-afiliados"), "Production deployment validation must recognize the canonical Vercel status context");
assert(preview.includes("Vercel – credi-marketplace-afiliados"), "Pull-request preview validation must use the canonical Vercel project status");
assert(productionE2E.includes("workflow_dispatch:"), "Production E2E must remain manually triggered");
for (const secret of ["E2E_BASE_URL", "E2E_OPERATION_ID", "E2E_LIVE_ROOM_ID", "E2E_STORAGE_STATE_JSON"]) {
  assert(productionE2E.includes(\`secrets.\${secret}\`), \`Production E2E must validate its required secret: \${secret}\`);
}
assert(admin.includes("secrets.VERCEL_TOKEN"), "Vercel administration workflow must require a dedicated VERCEL_TOKEN secret");
assert(admin.includes('VERCEL_SCOPE: "bazwjhon-2554s-projects"'), "Vercel administration workflow must use the configured project scope");
assert(admin.includes('VERCEL_PROJECT: "credi-marketplace-afiliados"'), "Vercel administration workflow must use the canonical project");
assert(!security.includes("audit-360-credi-20260922"), "Security workflow must not trigger on the obsolete one-off audit branch");

const workflowsDir = path.join(ROOT, ".github", "workflows");
if (fs.existsSync(workflowsDir)) {
  const workflowFiles = fs.readdirSync(workflowsDir).filter((name) => /\.ya?ml$/i.test(name));
  for (const name of workflowFiles) {
    const content = fs.readFileSync(path.join(workflowsDir, name), "utf8");
    assert(!/\bnetlify\b/i.test(content), \`GitHub workflow \${name} must not call the retired Netlify integration\`);
  }
}

console.log("=== Credi GitHub + Vercel Platform Contract ===");
console.log(\`Checks run: \${checks.length}\`);
console.log(\`Passed: \${checks.filter((x) => x.passed).length}\`);
console.log(\`Failed: \${checks.filter((x) => !x.passed).length}\`);
for (const failure of failures) console.error(\`FAIL: \${failure}\`);
if (failures.length) process.exit(1);
console.log("Platform contract: PASSED");
