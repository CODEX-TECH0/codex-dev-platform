#!/usr/bin/env bash
# Deploys every real Edge Function under supabase/functions/, explicitly
# excluding `_shared` (a helper directory, not a function — attempting to
# deploy it will fail, and if your loop aborts on the first failure and
# `_shared` sorts alphabetically before every real function name, NONE of
# your functions will have actually deployed, which matches "I pushed the
# edge code but it wasn't working" exactly).
#
# Usage: ./scripts/deploy-functions.sh <project-ref>
# Requires: supabase CLI logged in (`supabase login`), SUPABASE_ACCESS_TOKEN
# set or already authenticated via the CLI.

set -uo pipefail  # deliberately NOT -e: one function's failure must not stop the rest

PROJECT_REF="${1:-}"
if [ -z "$PROJECT_REF" ]; then
  echo "Usage: $0 <project-ref>"
  exit 1
fi

FUNCTIONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/supabase/functions"

FAILED=()
SUCCEEDED=()

for dir in "$FUNCTIONS_DIR"/*/; do
  name="$(basename "$dir")"
  if [ "$name" = "_shared" ]; then
    echo "skip:    $name (shared helper code, not a function)"
    continue
  fi
  if [ ! -f "$dir/index.ts" ]; then
    echo "skip:    $name (no index.ts found)"
    continue
  fi
  echo "deploy:  $name"
  if supabase functions deploy "$name" --project-ref "$PROJECT_REF"; then
    SUCCEEDED+=("$name")
  else
    echo "FAILED:  $name"
    FAILED+=("$name")
  fi
done

echo ""
echo "=== Summary ==="
echo "Succeeded (${#SUCCEEDED[@]}): ${SUCCEEDED[*]:-none}"
echo "Failed    (${#FAILED[@]}): ${FAILED[*]:-none}"

if [ "${#FAILED[@]}" -gt 0 ]; then
  exit 1
fi
