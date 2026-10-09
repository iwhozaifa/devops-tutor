# Infrastructure (Terraform)

The production stack from [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md), as code:

- VPC across 2 AZs: public subnets for the ALB, private subnets for EC2 and RDS, one NAT gateway
- Security groups: internet → ALB :443 → app :3000 → RDS :5432, each hop limited to the previous one
- ALB with HTTP→HTTPS redirect, TLS 1.3 policy, health check on `/api/health/ready`
- EC2 (Amazon Linux 2023, IMDSv2 only, encrypted root volume, no public IP) with Docker and Compose
- RDS PostgreSQL 16: private, encrypted, `rds.force_ssl`, deletion protection, automated backups, final snapshot
- ECR repositories for the app and migrate images (immutable tags, scan on push)
- SSM Parameter Store: every runtime setting under `/devops-tutor/prod/`, including a generated DB password and `AUTH_SECRET`
- IAM: a least-privilege instance role, and a GitHub OIDC deploy role limited to the repo's `production` environment
- SES domain identity, CloudWatch log group

## Tests

`terraform test` runs [tests/](tests/) offline against mocked providers. It asserts the security properties above, not only that the code parses. CI runs it with `fmt`, `validate` and `tflint` on every change under `infra/` (`.github/workflows/infra.yml`).

```bash
terraform init -backend=false
terraform test
tflint --init && tflint
```

## Apply

Prerequisites, created once outside this stack:
- an S3 bucket for state (versioned, encrypted, private)
- an ACM certificate for the domain in the stack's region

```bash
cp backend.hcl.example backend.hcl          # fill in the bucket
cp terraform.tfvars.example terraform.tfvars
terraform init -backend-config=backend.hcl
terraform plan -out tfplan
terraform apply tfplan
```

After the first apply:
1. Point the domain at `alb_dns_name` (Route 53 alias or CNAME).
2. Publish the `ses_dkim_tokens` CNAMEs, then request SES production access.
3. Copy `github_repository_variables` into the repository's Actions variables and create the `production` environment. The next push to `main` deploys.

The Terraform state contains the generated database password and `AUTH_SECRET`, so restrict access to the state bucket accordingly.
