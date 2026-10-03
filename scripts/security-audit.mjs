#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const ALLOWED_ADVISORY = "GHSA-vfj7-8cjw-p6xm";
const DEV_CHAIN = new Set([
  "@next/eslint-plugin-next",
  "fast-glob",
  "micromatch",
  "braces",
]);

function runAudit(args) {
  const result = spawnSync("npm", ["audit", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  let report;
  try {
    report = JSON.parse(result.stdout || "{}");
  } catch {
    console.error(result.stdout || "");
    console.error(result.stderr || "");
    throw new Error("npm audit did not return valid JSON");
  }

  return { code: result.status ?? 1, report };
}

function getHighOrCritical(report) {
  return Object.entries(report.vulnerabilities ?? {})
    .filter(([, finding]) => ["high", "critical"].includes(finding?.severity))
    .map(([name, finding]) => ({ name, ...finding }));
}

function hasExactAdvisory(finding) {
  const via = Array.isArray(finding.via) ? finding.via : [];
  return via.some((item) => typeof item === "object" && (
    String(item.source ?? "").includes(ALLOWED_ADVISORY) ||
    String(item.url ?? "").includes(ALLOWED_ADVISORY)
  ));
}

function hasOnlyKnownDependencyEdges(finding) {
  const via = Array.isArray(finding.via) ? finding.via : [];
  return via.every((item) => {
    if (typeof item === "string") return DEV_CHAIN.has(item);
    return String(item?.source ?? "").includes(ALLOWED_ADVISORY) ||
      String(item?.url ?? "").includes(ALLOWED_ADVISORY);
  });
}

function validateDevOnlyChain() {
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));

  if (pkg.devDependencies?.["@next/eslint-plugin-next"] == null) {
    throw new Error("@next/eslint-plugin-next is no longer explicitly pinned in devDependencies.");
  }

  const entries = Object.fromEntries(
    [...DEV_CHAIN].map((name) => [name, lock.packages?.[`node_modules/${name}`]])
  );

  for (const [name, entry] of Object.entries(entries)) {
    if (!entry) throw new Error(`Missing lock entry for ${name}`);
    if (entry.dev !== true) throw new Error(`${name} is not marked dev-only in package-lock.json`);
  }

  const plugin = entries["@next/eslint-plugin-next"];
  const fastGlob = entries["fast-glob"];
  const micromatch = entries["micromatch"];

  if (plugin.dependencies?.["fast-glob"] !== fastGlob.version) {
    throw new Error("Unexpected @next/eslint-plugin-next → fast-glob resolution.");
  }
  if (micromatch.dependencies?.braces !== undefined &&
      !String(micromatch.dependencies.braces).startsWith("^3.0.3")) {
    throw new Error("Unexpected micromatch → braces range; review the exception.");
  }

  return entries;
}

const production = runAudit(["--json", "--omit=dev", "--audit-level=high"]);
if (production.code !== 0) {
  console.error("Production dependency audit FAILED.");
  console.error(JSON.stringify(production.report, null, 2));
  process.exit(production.code || 1);
}

const full = runAudit(["--json", "--audit-level=high"]);
const highCritical = getHighOrCritical(full.report);

if (highCritical.length === 0) {
  console.log("Security audit PASSED: no high/critical vulnerabilities.");
  process.exit(0);
}

const onlyKnownException = highCritical.every((finding) =>
  DEV_CHAIN.has(finding.name) &&
  (finding.name === "braces" ? hasExactAdvisory(finding) : hasOnlyKnownDependencyEdges(finding))
);

if (!onlyKnownException) {
  console.error("Security audit FAILED: high/critical findings outside the approved dev-only upstream exception.");
  console.error(JSON.stringify(highCritical, null, 2));
  process.exit(1);
}

validateDevOnlyChain();

console.log("Security audit PASSED with one explicit dev-only upstream exception.");
console.log(`Exception: ${ALLOWED_ADVISORY}`);
console.log("Scope: @next/eslint-plugin-next → fast-glob → micromatch → braces");
console.log("Production dependencies: clean (npm audit --omit=dev).");
console.log("The exception remains fail-closed: any other high/critical finding fails CI.");
