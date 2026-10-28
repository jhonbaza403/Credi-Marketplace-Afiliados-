import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationDirectory = path.join(projectRoot, "supabase", "migrations");
const versionPattern = /^(\d+)_([a-z0-9][a-z0-9_-]*)\.sql$/i;

function isValidTimestampPrefix(prefix) {
  if (prefix.length !== 14) return true;

  const value = prefix;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const hour = Number(value.slice(8, 10));
  const minute = Number(value.slice(10, 12));
  const second = Number(value.slice(12, 14));
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second
  );
}

const entries = (await readdir(migrationDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
  .map((entry) => entry.name)
  .sort();

const errors = [];
const versions = new Map();

for (const name of entries) {
  const match = versionPattern.exec(name);
  if (!match) {
    errors.push(`Invalid migration filename: ${name}`);
    continue;
  }

  const [, version] = match;
  const previous = versions.get(version);
  if (previous) errors.push(`Duplicate migration version ${version}: ${previous} and ${name}`);
  else versions.set(version, name);

  if (!isValidTimestampPrefix(version)) {
    errors.push(`Invalid UTC timestamp prefix in migration: ${name}`);
  }
}

if (entries.length === 0) errors.push("No SQL migrations were found.");

if (errors.length > 0) {
  console.error("Supabase migration audit failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Supabase migration audit passed: ${entries.length} SQL files, unique versions, valid timestamp prefixes.`);
  console.log("This is a repository-level check; it does not prove remote migration history is reconciled.");
}
