#!/usr/bin/env bash
# Deploy an image tag on this EC2 host: refresh secrets, migrate, swap the
# container, and roll back if it does not become ready.
#   sudo IMAGE_REPO=<ecr-repo-uri> AWS_REGION=<region> ./deploy.sh <git-sha>
set -euo pipefail

TAG="${1:?usage: deploy.sh <image-tag>}"
: "${IMAGE_REPO:?set IMAGE_REPO to the ECR repository URI}"
: "${AWS_REGION:?set AWS_REGION}"
export IMAGE_REPO AWS_REGION

cd "$(dirname "$0")"
COMPOSE=(docker compose -f docker-compose.prod.yml)
STATE_DIR=/var/lib/devops-tutor
mkdir -p "$STATE_DIR"
PREVIOUS="$(cat "$STATE_DIR/current-tag" 2>/dev/null || true)"

log() { echo "[deploy $(date -u +%H:%M:%S)] $*"; }

wait_ready() {
  for _ in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:3000/api/health?ready=1" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

log "fetching configuration from SSM"
./fetch-env.sh

log "logging in to ECR"
aws ecr get-login-password --region "$AWS_REGION" |
  docker login --username AWS --password-stdin "${IMAGE_REPO%%/*}"

export IMAGE_TAG="$TAG"
log "pulling $TAG"
"${COMPOSE[@]}" --profile migrate pull

# Migrations must stay backward compatible with the running version: if the
# new container fails, the old one comes back on the migrated schema.
log "running database migrations"
"${COMPOSE[@]}" run --rm migrate

log "starting $TAG"
"${COMPOSE[@]}" up -d --no-deps app

if wait_ready; then
  echo "$TAG" >"$STATE_DIR/current-tag"
  docker image prune -f >/dev/null
  log "deployed $TAG"
  exit 0
fi

log "$TAG did not become ready; recent logs:"
"${COMPOSE[@]}" logs --tail 50 app || true

if [[ -n "$PREVIOUS" && "$PREVIOUS" != "$TAG" ]]; then
  log "rolling back to $PREVIOUS"
  export IMAGE_TAG="$PREVIOUS"
  "${COMPOSE[@]}" up -d --no-deps app
  wait_ready && log "rolled back to $PREVIOUS" || log "rollback is not ready either"
fi
exit 1
