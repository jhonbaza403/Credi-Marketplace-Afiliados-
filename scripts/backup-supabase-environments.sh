#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Logical database backup for both Credi Supabase environments.
# Supply connection URLs through environment variables; never commit them.
# The output directory is private and ignored by Git.

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'Required command not found: %s\n' "$1" >&2
    exit 1
  }
}

require_command supabase
require_command sha256sum

: "${PRODUCTION_DATABASE_URL:?Set PRODUCTION_DATABASE_URL in your local shell. Do not paste it into chat or commit it.}"
: "${PREVIEW_DATABASE_URL:?Set PREVIEW_DATABASE_URL in your local shell. Do not paste it into chat or commit it.}"

BACKUP_ROOT="${SUPABASE_BACKUP_DIR:-./backups/supabase}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR="${BACKUP_ROOT}/${STAMP}"

if [[ -e "$RUN_DIR" ]]; then
  printf 'Backup destination already exists; refusing to overwrite: %s\n' "$RUN_DIR" >&2
  exit 1
fi

mkdir -p "$RUN_DIR"
chmod 700 "$BACKUP_ROOT" "$RUN_DIR"

dump_environment() {
  local label="$1"
  local connection_url="$2"
  local target="${RUN_DIR}/${label}"

  mkdir -m 700 "$target"
  printf 'Creating logical backup for %s...\n' "$label"

  # Keep the URL out of logs and shell tracing. The dump contains logical SQL,
  # not credentials; role passwords are intentionally not exported by Supabase.
  supabase db dump --db-url "$connection_url" -f "$target/roles.sql" --role-only
  supabase db dump --db-url "$connection_url" -f "$target/schema.sql"
  supabase db dump --db-url "$connection_url" -f "$target/data.sql" \
    --use-copy --data-only \
    -x "storage.buckets_vectors" \
    -x "storage.vector_indexes"

  for file in roles.sql schema.sql data.sql; do
    if [[ ! -s "$target/$file" ]]; then
      printf 'Backup file missing or empty: %s/%s\n' "$label" "$file" >&2
      exit 1
    fi
  done

  (
    cd "$target"
    sha256sum roles.sql schema.sql data.sql > SHA256SUMS
    sha256sum --check SHA256SUMS
  )
  chmod 600 "$target"/*
  printf 'Verified logical backup files for %s.\n' "$label"
}

printf 'Supabase CLI: '
supabase --version

dump_environment production "$PRODUCTION_DATABASE_URL"
dump_environment preview "$PREVIEW_DATABASE_URL"

(
  cd "$RUN_DIR"
  find production preview -type f -name SHA256SUMS -print0 |
    sort -z |
    xargs -0 -r sha256sum > BACKUP-MANIFEST.sha256
)
chmod 600 "$RUN_DIR/BACKUP-MANIFEST.sha256"

printf '\nBackup completed and checksums verified.\n'
printf 'Local-only destination: %s\n' "$RUN_DIR"
printf 'Do not commit this directory or upload it to a public repository.\n'
printf 'Note: Supabase Storage object bytes are not included in database dumps.\n'
