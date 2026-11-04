#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$BASH_SOURCE")/.." && pwd)"
cd "$ROOT_DIR"

for command_name in supabase psql; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "::error::Required command is missing: $command_name"
    exit 1
  fi
done

ENV_FILE="$(mktemp)"
trap 'rm -f "$ENV_FILE"' EXIT

supabase status --env --output-format text > "$ENV_FILE"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if ! declare -p DB_URL >/dev/null 2>&1; then
  echo "::error::Supabase local status did not provide DB_URL"
  exit 1
fi

SQL_COUNT="$(find supabase/tests -maxdepth 1 -type f -name '*.sql' | wc -l | tr -d ' ')"
if [[ "$SQL_COUNT" -eq 0 ]]; then
  echo "::error::No root-level SQL regression files found in supabase/tests"
  exit 1
fi

printf 'Running %s root-level SQL regression files against the local database.\n' "$SQL_COUNT"
while IFS= read -r -d '' sql_file; do
  printf '\n==> %s\n' "$sql_file"
  psql "$DB_URL" --no-psqlrc --set=ON_ERROR_STOP=1 --file="$sql_file"
done < <(find supabase/tests -maxdepth 1 -type f -name '*.sql' -print0 | sort -z)

echo "Credi local Supabase SQL regressions: PASS"
