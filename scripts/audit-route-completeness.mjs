#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APP = path.join(ROOT, "src", "app");
const REQUIRED_PAGES = [
  "apps", "business-os", "automation", "abastecimiento", "compras-mayoristas",
  "ecosistema-avanzado", "gestion-empresarial", "mercados-conectados",
  "negociaciones", "proveedores-verificados", "red-comercial", "historias",
  "commerce-studio", "product-graph", "inventario", "jobs", "privacy",
  "terms", "legal", "cookies", "consumer-rights", "contacto",
];
const WEBHOOKS = [
  { name: "Stripe billing", route: "api/billing/webhook", required: true },
  { name: "Cloudflare Stream", route: "api/live/cloudflare-webhook", required: true },
  { name: "Twilio communications", route: "api/communications/webhooks/twilio", required: false },
  { name: "Affiliate partner", route: "api/affiliate/webhook", required: false },
];

function hasPage(route) {
  const directory = path.join(APP, route);
  return ["page.tsx", "page.ts", "page.jsx", "page.js"].some((file) =>
    fs.existsSync(path.join(directory, file)),
  );
}
function hasRoute(route) {
  const directory = path.join(APP, route);
  return ["route.ts", "route.tsx", "route.js", "route.jsx"].some((file) =>
    fs.existsSync(path.join(directory, file)),
  );
}
function walkPages(directory, segments = [], out = []) {
  if (!fs.existsSync(directory)) return out;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith("@") || entry.name.startsWith("_")) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const next = entry.name.startsWith("(") && entry.name.endsWith(")")
        ? segments : [...segments, entry.name];
      walkPages(absolute, next, out);
    } else if (/^page\.(tsx?|jsx?)$/.test(entry.name)) {
      out.push("/" + segments.join("/") || "/");
    }
  }
  return out;
}

const missingPages = REQUIRED_PAGES.filter((route) => !hasPage(route));
const missingRequiredWebhooks = WEBHOOKS.filter((hook) => hook.required && !hasRoute(hook.route));
const pageCount = new Set(walkPages(APP)).size;

console.log("=== Credi route completeness audit ===");
console.log("App Router page files:", pageCount);
console.log("Required menu/legal pages checked:", REQUIRED_PAGES.length);
console.log("Missing required pages:", missingPages.length);
for (const route of missingPages) console.error("  MISSING PAGE /" + route);
console.log("Webhook endpoints:");
for (const hook of WEBHOOKS) {
  const exists = hasRoute(hook.route);
  console.log(`  ${exists ? "PRESENT" : hook.required ? "MISSING REQUIRED" : "NOT CONFIGURED"} ${hook.name}: /${hook.route}`);
}
if (missingRequiredWebhooks.length) {
  console.error("Required webhook handlers are missing; see docs/ROUTE_REGISTRY.md.");
  process.exitCode = 1;
} else if (missingPages.length) {
  process.exitCode = 1;
} else {
  console.log("Required route completeness checks: PASSED");
}
