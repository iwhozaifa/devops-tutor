#!/usr/bin/env bash
# Restore drill: proves the latest automated RDS snapshot can be restored and
# used. Restores it to a temporary private instance, runs
# scripts/restore-check.ts against it on the app instance (RDS is private),
# then deletes the temporary instance, also when anything fails.
#
#   DB_INSTANCE=devops-tutor EC2_INSTANCE_ID=i-... DB_SECURITY_GROUP_ID=sg-... AWS_REGION=eu-west-1 \
#   MIGRATE_IMAGE_REPO=<account>.dkr.ecr.<region>.amazonaws.com/devops-tutor-migrate \
#   deploy/restore-drill.sh [--dry-run]
#
# Run monthly by .github/workflows/restore-drill.yml.
set -euo pipefail

: "${DB_INSTANCE:?}" "${EC2_INSTANCE_ID:?}" "${AWS_REGION:?}" "${MIGRATE_IMAGE_REPO:?}" "${DB_SECURITY_GROUP_ID:?}"
POLL_SECONDS="${POLL_SECONDS:-15}"
DRILL_ID="${DB_INSTANCE}-drill-$(date -u +%Y%m%d-%H%M%S)"
DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

log() { echo "[restore-drill $(date -u +%H:%M:%S)] $*" >&2; }

if $DRY_RUN; then
  cat <<EOF
Plan for ${DB_INSTANCE} (nothing will be changed):
  aws rds describe-db-snapshots --db-instance-identifier ${DB_INSTANCE} --snapshot-type automated
  aws rds restore-db-instance-from-db-snapshot --db-instance-identifier ${DRILL_ID} --no-publicly-accessible --no-multi-az ...
  aws rds wait db-instance-available --db-instance-identifier ${DRILL_ID}
  aws ssm send-command --instance-ids ${EC2_INSTANCE_ID}   (restore-check.ts against ${DRILL_ID})
  aws rds delete-db-instance --db-instance-identifier ${DRILL_ID} --skip-final-snapshot
EOF
  exit 0
fi

snapshot=$(aws rds describe-db-snapshots --db-instance-identifier "$DB_INSTANCE" --snapshot-type automated \
  --query 'reverse(sort_by(DBSnapshots,&SnapshotCreateTime))[0].DBSnapshotIdentifier' --output text)
if [[ -z "$snapshot" || "$snapshot" == "None" ]]; then
  log "no automated snapshot found for $DB_INSTANCE"
  exit 1
fi

cleanup() {
  log "deleting $DRILL_ID"
  aws rds delete-db-instance --db-instance-identifier "$DRILL_ID" \
    --skip-final-snapshot --delete-automated-backups >/dev/null 2>&1 || log "delete failed or instance was never created"
}
trap cleanup EXIT

log "restoring $snapshot to $DRILL_ID"
# Same subnet group and security groups as production: private, and
# reachable from the app instance only
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier "$DRILL_ID" \
  --db-snapshot-identifier "$snapshot" \
  --db-subnet-group-name "$DB_INSTANCE" \
  --vpc-security-group-ids "$DB_SECURITY_GROUP_ID" \
  --db-parameter-group-name "${DB_PARAMETER_GROUP:-${DB_INSTANCE}-pg16}" \
  --db-instance-class "${DRILL_INSTANCE_CLASS:-db.t4g.micro}" \
  --no-publicly-accessible --no-multi-az \
  --tags Key=Purpose,Value=restore-drill >/dev/null

aws rds wait db-instance-available --db-instance-identifier "$DRILL_ID"
host=$(aws rds describe-db-instances --db-instance-identifier "$DRILL_ID" \
  --query 'DBInstances[0].Endpoint.Address' --output text)
log "restored; verifying from $EC2_INSTANCE_ID against $host"

# On the instance: reuse the production credentials (the snapshot keeps the
# master password) with the drill host, and run the check in the migrate
# image of the release that is currently deployed.
remote=$(cat <<EOF
set -eu
url=\$(grep '^DATABASE_URL=' /etc/devops-tutor/app.env | cut -d= -f2- | sed -E 's#@[^:/]+:#@${host}:#')
tag=\$(cat /var/lib/devops-tutor/current-tag)
docker run --rm -e DATABASE_URL="\$url" ${MIGRATE_IMAGE_REPO}:\$tag ./node_modules/.bin/tsx scripts/restore-check.ts
EOF
)
command_id=$(aws ssm send-command --instance-ids "$EC2_INSTANCE_ID" --document-name AWS-RunShellScript \
  --comment "restore drill $DRILL_ID" \
  --parameters "$(jq -cn --arg c "$remote" '{commands: [$c], executionTimeout: ["900"]}')" \
  --query Command.CommandId --output text)
aws ssm wait command-executed --command-id "$command_id" --instance-id "$EC2_INSTANCE_ID" || true
status=$(aws ssm get-command-invocation --command-id "$command_id" --instance-id "$EC2_INSTANCE_ID" \
  --query Status --output text)

if [[ "$status" != "Success" ]]; then
  log "verification failed (SSM status: $status)"
  aws ssm get-command-invocation --command-id "$command_id" --instance-id "$EC2_INSTANCE_ID" \
    --query StandardOutputContent --output text >&2 2>/dev/null || true
  exit 1
fi
log "restore verified"
