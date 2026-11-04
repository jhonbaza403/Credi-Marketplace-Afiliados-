#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const previous = process.env.VERCEL_GIT_PREVIOUS_SHA;
const current = process.env.VERCEL_GIT_COMMIT_SHA || "HEAD";
const base = previous && previous.trim() ? previous.trim() : "HEAD^";

let output = "";
try {
  output = execFileSync("git", ["diff", "--name-only", base, current], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch {
  console.warn("[vercel-ignore-build] Unable to inspect Git diff; continuing with build.");
  process.exit(1);
}

const changed = output
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

// Supabase synchronizes branch-specific credentials when preview branches change.
 // A Preview deployment must rebuild when its Supabase schema/config changes so
 // the Next.js bundle consumes the branch-scoped NEXT_PUBLIC_SUPABASE_* values.
const isPreviewDeployment = process.env.VERCEL_ENV === "preview";
const runtimeRelevant = changed.filter((path) => {
  if (isPreviewDeployment && path.startsWith("supabase/")) {
    return true;
  }
  return !(
    path.startsWith("supabase/") ||
    path.startsWith(".github/") ||
    path.startsWith("scripts/") ||
    path.startsWith("tests/") ||
    path.startsWith("docs/") ||
    path.endsWith(".md")
  );
});

console.log("[vercel-ignore-build] Changed files:", changed.length);
console.log("[vercel-ignore-build] Runtime-relevant files:", runtimeRelevant.length);

if (changed.length > 0 && runtimeRelevant.length === 0) {
  console.log("[vercel-ignore-build] No runtime-relevant changes. Skip Vercel build.");
  process.exit(0);
}

console.log("[vercel-ignore-build] Runtime/config changes detected. Build required.");
process.exit(1);
