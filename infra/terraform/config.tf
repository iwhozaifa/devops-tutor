resource "random_password" "auth_secret" {
  length  = 48
  special = false
}

locals {
  db_base = "postgresql://${aws_db_instance.main.username}:${random_password.db.result}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}"

  # Read by deploy/fetch-env.sh on the instance. Secrets end up in Terraform
  # state too, so keep the state bucket encrypted and access-restricted.
  app_config = {
    DATABASE_URL         = "${local.db_base}?sslmode=verify-full"
    MIGRATE_DATABASE_URL = "${local.db_base}?sslmode=require&sslcert=/app/certs/rds-global-bundle.pem&sslaccept=strict"
    AUTH_SECRET          = random_password.auth_secret.result
    AUTH_URL             = "https://${var.domain_name}"
    AUTH_TRUST_HOST      = "true"
    TRUSTED_PROXY_HOPS   = "1"
    DB_POOL_MAX          = "10"
    LOG_LEVEL            = "info"
    MAIL_TRANSPORT       = "ses"
    MAIL_FROM            = coalesce(var.mail_from, "DevOps Tutor <no-reply@${var.domain_name}>")
    AWS_REGION           = local.region
  }
}

resource "aws_ssm_parameter" "app" {
  for_each = local.app_config
  name     = "${local.ssm_path}/${each.key}"
  type     = "SecureString"
  value    = each.value
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/devops-tutor/app"
  retention_in_days = var.log_retention_days
}

resource "aws_sesv2_email_identity" "domain" {
  email_identity = var.domain_name
}
