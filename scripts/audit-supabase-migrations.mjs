import { readdir } from "node:fs/promises";
import path from "node:path";

const migrationsDirectory = path.resolve("supabase/migrations");
const entries = await readdir(migrationsDirectory, { withFileTypes: true });
const files = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
  .map((entry) => entry.name)
  .sort();

if (files.length === 0) {
  throw new Error("No SQL migration files found in supabase/migrations");
}

const versions = new Map();
const invalidNames = [];

for (const filename of files) {
  const match = /^(\\d+)_([a-z0-9][a-z0-9_-]*)\\.sql$/i.exec(filename);
  if (!match) {
    invalidNames.push(filename);
    continue;
  }

  const [, version] = match;
  const existing = versions.get(version);
  if (existing) {
    throw new Error(
      `Duplicate Supabase migration version "${version}": ${existing} and ${filename}`,
    );
  }
  versions.set(version, filename);
}

if (invalidNames.length > 0) {
  throw new Error(
    `Invalid Supabase migration filenames:\\n${invalidNames.map((name) => `- ${name}`).join("\\n")}`,
  );
}

console.log(
  `Supabase migration catalog: ${files.length} SQL files, ${versions.size} unique versions, no duplicate or invalid filenames.`,
);
