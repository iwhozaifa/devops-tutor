#!/usr/bin/env bash
# Serve the standalone production build for Playwright.
set -euo pipefail
: "${E2E_DATABASE_URL:?set E2E_DATABASE_URL to a disposable database}"

if [[ ! -f .next/standalone/server.js ]]; then
  echo "No standalone build found; run npm run build first" >&2
  exit 1
fi
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/

cd .next/standalone
export NODE_ENV=production HOSTNAME=127.0.0.1 PORT="${PORT:-3200}"
export DATABASE_URL="$E2E_DATABASE_URL"
export AUTH_URL="http://127.0.0.1:${PORT}" AUTH_TRUST_HOST=true
export AUTH_SECRET="e2e-tests-only-secret-0123456789abcdef"
export DB_POOL_MAX="${DB_POOL_MAX:-5}" LOG_LEVEL=warn
exec node server.js
