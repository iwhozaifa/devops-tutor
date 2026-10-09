#!/usr/bin/env bash
# Reads the list of files changed by a PR on stdin and fails when application
# code changed without any test changing with it. CI pipes in
# `git diff --name-only <base>...<head>`; the `no-tests-needed` label skips it.
set -euo pipefail

source_changes=()
test_changed=false

while IFS= read -r file || [[ -n "$file" ]]; do
  [[ -z "$file" ]] && continue
  case "$file" in
    *.test.ts | *.test.tsx | tests/* | e2e/*) test_changed=true ;;
    src/generated/* | prisma/seed/*) ;;
    src/* | prisma/*) source_changes+=("$file") ;;
  esac
done

if (( ${#source_changes[@]} > 0 )) && [[ "$test_changed" == false ]]; then
  echo "Application code changed without any test changes:"
  printf '  %s\n' "${source_changes[@]}"
  echo "Add or update tests, or label the PR 'no-tests-needed' if none apply."
  exit 1
fi

echo "ok: ${#source_changes[@]} source file(s) changed, tests changed: $test_changed"
