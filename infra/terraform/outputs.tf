output "alb_dns_name" {
  description = "Point the domain's DNS (CNAME or alias) here"
  value       = aws_lb.main.dns_name
}

output "ses_dkim_tokens" {
  description = "Publish <token>._domainkey.<domain> CNAME <token>.dkim.amazonses.com for each"
  value       = try(aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens, [])
}

output "github_repository_variables" {
  description = "Set these as GitHub repository variables for the Deploy workflow"
  value = {
    AWS_REGION          = local.region
    AWS_DEPLOY_ROLE_ARN = aws_iam_role.github_deploy.arn
    ECR_REPOSITORY      = aws_ecr_repository.repo["devops-tutor"].name
    EC2_INSTANCE_ID     = aws_instance.app.id
  }
}

output "rds_endpoint" {
  value = aws_db_instance.main.address
}
