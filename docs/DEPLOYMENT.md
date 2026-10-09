# Deploying to AWS (EC2 + RDS)

Production runs as a Docker container on one EC2 instance. Around it:

- PostgreSQL is on **RDS**.
- HTTPS ends at an **Application Load Balancer**.
- Secrets live in **SSM Parameter Store**.
- Logs go to **CloudWatch Logs**.

GitHub Actions builds the images, pushes them to **ECR**, and deploys through **SSM Run Command**. No SSH or long-lived AWS keys are involved.

```
Internet ──HTTPS──▶ ALB (ACM cert) ──HTTP:3000──▶ EC2 (Docker: app) ──TLS:5432──▶ RDS PostgreSQL
                                                     │
                                                     ├── logs ──▶ CloudWatch /devops-tutor/app
                                                     └── config ◀── SSM /devops-tutor/prod/*
GitHub Actions ──OIDC──▶ ECR push ──▶ SSM send-command ──▶ deploy.sh on EC2
```

## What the repository provides

| File | Purpose |
| --- | --- |
| `Dockerfile` | `runner` target: Next.js standalone server, non-root, with a health check. `migrate` target: `prisma migrate deploy` plus the seed and admin scripts. |
| `deploy/docker-compose.prod.yml` | Runs the app container on the host, with the awslogs driver, memory limit and read-only filesystem. |
| `deploy/fetch-env.sh` | Writes `/etc/devops-tutor/app.env` (mode 600) from SSM. |
| `deploy/deploy.sh` | Fetches the env, pulls images, migrates, swaps the container, waits for `/api/health?ready=1`, and rolls back on failure. |
| `.github/workflows/ci.yml` | Lint, typecheck, tests, audit, migrate + seed + build against Postgres, Docker build. |
| `.github/workflows/deploy.yml` | On push to `main`: CI, then build and push both images, then run `deploy.sh` through SSM. |

## One-time AWS setup

Use one region throughout. Names below are suggestions.

### 1. Network

- A VPC with two public subnets for the ALB and two private subnets for EC2 and RDS, each pair spread across two AZs.
- The private subnets need outbound internet (a NAT gateway) or VPC endpoints for `ecr.api`, `ecr.dkr`, `s3`, `ssm`, `ssmmessages`, `ec2messages` and `logs`.
- Security groups:
  - `alb-sg`: inbound 443 and 80 from `0.0.0.0/0`.
  - `app-sg`: inbound **3000 from `alb-sg` only**. The app trusts the last `X-Forwarded-For` hop, so nothing else may reach port 3000.
  - `db-sg`: inbound 5432 from `app-sg` only.

### 2. RDS PostgreSQL

- PostgreSQL 16, in the private subnets, with `db-sg`, not publicly accessible.
- Storage encryption on, automated backups (7+ days), deletion protection on, Multi-AZ if the budget allows.
- Set `rds.force_ssl = 1` in a custom parameter group.
- Create database `devtutor` and an application user. Use a password of letters and digits only, or percent-encode it in the URL.

### 3. ECR

Create two repositories: `devops-tutor` and `devops-tutor-migrate`. Add a lifecycle policy that keeps the last 20 images in each.

### 4. EC2 instance

- Amazon Linux 2023, `t3.small` or larger, in a private subnet, with `app-sg`.
- Install Docker and the Compose plugin:
  ```bash
  sudo dnf install -y docker && sudo systemctl enable --now docker
  sudo mkdir -p /usr/local/lib/docker/cli-plugins
  sudo curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose && sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
  ```
- On a 2 GB instance, the defaults are `APP_MEM_LIMIT=1g` and `APP_HEAP_MB=768`. To change them, export them before `deploy.sh`.

**Instance role** (instance profile):
- `AmazonSSMManagedInstanceCore` (Run Command, Session Manager)
- `AmazonEC2ContainerRegistryReadOnly`
- `ssm:GetParametersByPath` on `arn:aws:ssm:<region>:<account>:parameter/devops-tutor/prod*`, plus `kms:Decrypt` on the key used for the SecureStrings
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` on `/devops-tutor/*`

### 5. Load balancer

- An ALB in the public subnets with `alb-sg`.
- Listener 443: an ACM certificate for your domain, forwarding to the target group.
- Listener 80: redirect to 443.
- Target group: HTTP, port 3000, instance target.
  - Health check path: `/api/health?ready=1`
  - Healthy threshold 2, interval 15s

### 6. Parameters (SSM Parameter Store, SecureString)

Under `/devops-tutor/prod/`. Each parameter name becomes an environment variable.

| Parameter | Example |
| --- | --- |
| `DATABASE_URL` | `postgresql://app:<pw>@<rds-endpoint>:5432/devtutor?sslmode=verify-full` |
| `MIGRATE_DATABASE_URL` | `postgresql://app:<pw>@<rds-endpoint>:5432/devtutor?sslmode=require&sslcert=/app/certs/rds-global-bundle.pem&sslaccept=strict` |
| `AUTH_SECRET` | output of `openssl rand -base64 32` |
| `AUTH_URL` | `https://devops-tutor.example.com` |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | optional; the GitHub OAuth app callback is `https://<domain>/api/auth/callback/github` |
| `TRUSTED_PROXY_HOPS` | `1` (just the ALB; add one per extra proxy, such as CloudFront) |
| `DB_POOL_MAX` | `10` |
| `LOG_LEVEL` | `info` |

**Why there are two URLs:**
- The app connects through node-postgres. It reads `sslmode=verify-full` and verifies RDS against the CA bundle in the image (`NODE_EXTRA_CA_CERTS`).
- The Prisma migration engine has its own TLS parameters (`sslcert` is the CA to trust, `sslaccept=strict`). Passing these to node-postgres would break it, since it reads `sslcert` as a client certificate.

After the first deploy, confirm the migrate URL with:
`docker compose -f /opt/devops-tutor/docker-compose.prod.yml run --rm migrate ./node_modules/.bin/prisma migrate status`

### 7. GitHub → AWS (OIDC)

1. Add the IAM OIDC identity provider `token.actions.githubusercontent.com` (audience `sts.amazonaws.com`).
2. Create a role trusted by it, restricted with the condition `token.actions.githubusercontent.com:sub = repo:<owner>/devops-tutor:environment:production`.
   - Permissions: push to both ECR repositories (`ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload`, `ecr:PutImage`, `ecr:BatchGetImage`).
   - `ssm:SendCommand` on the instance and on `AWS-RunShellScript`.
   - `ssm:GetCommandInvocation`.
3. In the GitHub repository, create an environment `production` (add required reviewers if you want manual approval).
4. Set repository variables: `AWS_REGION`, `AWS_DEPLOY_ROLE_ARN`, `ECR_REPOSITORY=devops-tutor`, `EC2_INSTANCE_ID`.

The deploy job is skipped until `EC2_INSTANCE_ID` is set.

## First deploy

1. Push to `main`, or run the **Deploy** workflow manually. It migrates the empty database and starts the app.
2. Seed the curriculum, using an SSM session on the instance (`aws ssm start-session --target <instance-id>`):
   ```bash
   cd /opt/devops-tutor
   export IMAGE_REPO=<account>.dkr.ecr.<region>.amazonaws.com/devops-tutor IMAGE_TAG=$(cat /var/lib/devops-tutor/current-tag) AWS_REGION=<region>
   sudo -E docker compose -f docker-compose.prod.yml run --rm migrate ./node_modules/.bin/tsx prisma/seed/index.ts
   ```
3. Register your account in the app, then promote it:
   ```bash
   sudo -E docker compose -f docker-compose.prod.yml run --rm migrate ./node_modules/.bin/tsx scripts/promote-admin.ts you@example.com
   ```

## Day-to-day

- **Deploy:** merge to `main`.
- **Roll back:** run the Deploy workflow from an older commit, or on the host run `sudo IMAGE_REPO=... AWS_REGION=... /opt/devops-tutor/deploy.sh <older-sha>`. `deploy.sh` also rolls back automatically when a new release fails its readiness check.
- **Migrations:** they run before the new container starts, and the old container keeps serving during the swap. Keep them backward compatible with the previous release: add columns, backfill, then remove in a later release.
- **Logs:** CloudWatch log group `/devops-tutor/app`. Lines are JSON:
  ```
  fields @timestamp, level, msg, route, err.message | filter level = "error" | sort @timestamp desc
  ```
- **Secrets rotation:** update the SSM parameter and redeploy (`deploy.sh` re-reads SSM). Rotating `AUTH_SECRET` signs everyone out.

## Scaling beyond one instance

The login and registration rate limiter keeps its counters in process memory (`src/lib/rate-limit.ts`). Before you put the app in an Auto Scaling group with more than one instance:

- Move the limiter to Postgres or ElastiCache.
- Size `DB_POOL_MAX × instances` under the RDS `max_connections`.
- Swap `deploy.sh` for a rolling deployment (for example an ASG instance refresh, or ECS).
