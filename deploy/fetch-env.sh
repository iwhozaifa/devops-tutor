#!/usr/bin/env bash
# Write every parameter under the SSM path to the env file read by
# docker-compose.prod.yml. Credentials come from the EC2 instance role.
#   /devops-tutor/prod/AUTH_SECRET  ->  AUTH_SECRET=...
set -euo pipefail

SSM_PATH="${SSM_PATH:-/devops-tutor/prod}"
ENV_FILE="${ENV_FILE:-/etc/devops-tutor/app.env}"

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
chmod 600 "$tmp"

aws ssm get-parameters-by-path \
  --path "$SSM_PATH" \
  --recursive \
  --with-decryption \
  --query 'Parameters[].[Name,Value]' \
  --output text |
while IFS=$'\t' read -r name value; do
  printf '%s=%s\n' "${name##*/}" "$value"
done >"$tmp"

for required in DATABASE_URL AUTH_SECRET AUTH_URL; do
  grep -q "^${required}=" "$tmp" || { echo "missing SSM parameter ${SSM_PATH}/${required}" >&2; exit 1; }
done

install -d -m 700 "$(dirname "$ENV_FILE")"
install -m 600 "$tmp" "$ENV_FILE"
echo "wrote $(wc -l <"$tmp") variables to $ENV_FILE"
