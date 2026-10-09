#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appRoot = path.join(root, "src", "app");
const navPath = path.join(root, "src", "components", "layout", "Navbar.tsx");
const pageFiles = new Set(["page.ts", "page.tsx", "page.js", "page.jsx"]);

function walk(directory, segments = [], routes = []) {
  if (!fs.existsSync(directory)) return routes;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith("@") || entry.name.startsWith("_")) continue;
    const absolute = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      // Route groups affect layout but do not appear in the URL.
      const nextSegments =
        entry.name.startsWith("(") && entry.name.endsWith(")")
          ? segments
          : [...segments, entry.name];
      walk(absolute, nextSegments, routes);
      continue;
    }

    if (pageFiles.has(entry.name)) {
      const route = "/" + segments.join("/");
      routes.push(route === "" ? "/" : route);
    }
  }

  return routes;
}

function normalizeRoute(value) {
  const clean = value.split(/[?#]/, 1)[0].replace(/\\/g, "/").replace(/\/+$/, "");
  return clean || "/";
}

function routeMatches(href, route) {
  const wanted = normalizeRoute(href).split("/").filter(Boolean);
  const actual = normalizeRoute(route).split("/").filter(Boolean);
  if (wanted.length !== actual.length) return false;

  return actual.every((segment, index) =>
    /^\[.*\]$/.test(segment) || segment === wanted[index],
  );
}

if (!fs.existsSync(navPath)) {
  console.error("Menu route audit: Navbar.tsx not found.");
  process.exit(1);
}

const source = fs.readFileSync(navPath, "utf8");
const candidates = new Set();
for (const match of source.matchAll(/\bhref\s*:\s*["'](\/[^"']*)["']/g)) {
  candidates.add(normalizeRoute(match[1]));
}
for (const match of source.matchAll(/\bhref\s*=\s*["'](\/[^"']*)["']/g)) {
  candidates.add(normalizeRoute(match[1]));
}

const routes = [...new Set(walk(appRoot))];
const missing = [...candidates]
  .filter((href) => !routes.some((route) => routeMatches(href, route)))
  .sort();

console.log("=== Credi Marketplace Menu Route Audit ===");
console.log("App Router pages: " + routes.length);
console.log("Static menu destinations: " + candidates.size);
console.log("Missing destinations: " + missing.length);
for (const href of missing) console.error("- MISSING " + href);
if (missing.length) process.exit(1);
console.log("Menu route audit: PASSED");
