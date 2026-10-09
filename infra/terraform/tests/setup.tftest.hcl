# Security and wiring guarantees of the production stack, checked offline
# against mocked providers: `terraform test` (no AWS credentials needed).

mock_provider "aws" {
  source = "./tests/mocks/aws"
}

mock_provider "random" {
  source = "./tests/mocks/random"
}

variables {
  domain_name     = "tutor.example.com"
  certificate_arn = "arn:aws:acm:eu-west-1:123456789012:certificate/test"
  github_repo     = "iwhozaifa/devops-tutor"
}

run "database_is_private_encrypted_and_protected" {
  command = apply

  assert {
    condition     = aws_db_instance.main.publicly_accessible == false
    error_message = "RDS must not be publicly accessible"
  }
  assert {
    condition     = aws_db_instance.main.storage_encrypted && aws_db_instance.main.deletion_protection
    error_message = "RDS must be encrypted and deletion-protected"
  }
  assert {
    condition     = aws_db_instance.main.backup_retention_period >= 7
    error_message = "RDS must keep at least 7 days of automated backups"
  }
  assert {
    condition     = aws_db_instance.main.skip_final_snapshot == false
    error_message = "Deleting RDS must take a final snapshot"
  }
  assert {
    condition     = anytrue([for p in aws_db_parameter_group.main.parameter : p.name == "rds.force_ssl" && p.value == "1"])
    error_message = "RDS must reject non-TLS connections (rds.force_ssl = 1)"
  }
  assert {
    condition     = toset(aws_db_subnet_group.main.subnet_ids) == toset(aws_subnet.private[*].id)
    error_message = "RDS must live in the private subnets"
  }
}

run "only_the_alb_reaches_the_app_and_only_the_app_reaches_the_db" {
  command = apply

  assert {
    condition = (
      aws_vpc_security_group_ingress_rule.app_from_alb.referenced_security_group_id == aws_security_group.alb.id &&
      aws_vpc_security_group_ingress_rule.app_from_alb.from_port == 3000 &&
      aws_vpc_security_group_ingress_rule.app_from_alb.to_port == 3000
    )
    error_message = "The app port must only be open to the ALB security group"
  }
  assert {
    condition = (
      aws_vpc_security_group_ingress_rule.db_from_app.referenced_security_group_id == aws_security_group.app.id &&
      aws_vpc_security_group_ingress_rule.db_from_app.from_port == 5432
    )
    error_message = "Postgres must only be open to the app security group"
  }
  assert {
    condition     = alltrue([for r in [aws_vpc_security_group_ingress_rule.app_from_alb, aws_vpc_security_group_ingress_rule.db_from_app] : r.cidr_ipv4 == null])
    error_message = "App and DB ingress must not be opened to CIDR ranges"
  }
}

run "alb_serves_https_only_and_checks_readiness" {
  command = apply

  assert {
    condition = (
      aws_lb_listener.http.default_action[0].type == "redirect" &&
      aws_lb_listener.http.default_action[0].redirect[0].protocol == "HTTPS" &&
      aws_lb_listener.http.default_action[0].redirect[0].status_code == "HTTP_301"
    )
    error_message = "Port 80 must permanently redirect to HTTPS"
  }
  assert {
    condition     = aws_lb_listener.https.protocol == "HTTPS" && startswith(aws_lb_listener.https.ssl_policy, "ELBSecurityPolicy-TLS13")
    error_message = "The HTTPS listener must use a TLS 1.3 policy"
  }
  assert {
    condition     = aws_lb_target_group.app.health_check[0].path == "/api/health/ready"
    error_message = "The target group must use the database readiness check"
  }
  assert {
    condition     = aws_lb.main.drop_invalid_header_fields == true
    error_message = "The ALB must drop invalid header fields"
  }
}

run "instance_is_hardened" {
  command = apply

  assert {
    condition     = aws_instance.app.metadata_options[0].http_tokens == "required"
    error_message = "IMDSv2 must be required"
  }
  assert {
    condition     = aws_instance.app.root_block_device[0].encrypted == true
    error_message = "The root volume must be encrypted"
  }
  assert {
    condition     = aws_instance.app.associate_public_ip_address == false && contains(aws_subnet.private[*].id, aws_instance.app.subnet_id)
    error_message = "The instance must be in a private subnet without a public IP"
  }
}

run "instance_role_is_least_privilege" {
  command = apply

  assert {
    condition = alltrue([
      for s in jsondecode(aws_iam_role_policy.app.policy).Statement :
      !contains(flatten([s.Action]), "*") && !contains(flatten([s.Resource]), "*") || contains(flatten([s.Action]), "ecr:GetAuthorizationToken")
    ])
    error_message = "Only ecr:GetAuthorizationToken may use a wildcard resource; no wildcard actions"
  }
  assert {
    condition = anytrue([
      for s in jsondecode(aws_iam_role_policy.app.policy).Statement :
      contains(flatten([s.Action]), "ssm:GetParametersByPath") && alltrue([for r in flatten([s.Resource]) : endswith(r, ":parameter/devops-tutor/prod") || endswith(r, ":parameter/devops-tutor/prod/*")])
    ])
    error_message = "The instance may only read its own SSM path"
  }
  assert {
    condition = anytrue([
      for s in jsondecode(aws_iam_role_policy.app.policy).Statement :
      contains(flatten([s.Action]), "ses:SendEmail")
    ])
    error_message = "The instance must be allowed to send email through SES"
  }
}

run "github_deploy_role_trusts_only_the_production_environment" {
  command = apply

  assert {
    condition = (
      jsondecode(aws_iam_role.github_deploy.assume_role_policy).Statement[0].Condition.StringEquals["token.actions.githubusercontent.com:sub"] ==
      "repo:iwhozaifa/devops-tutor:environment:production"
    )
    error_message = "The deploy role must only trust the repo's production environment"
  }
  assert {
    condition     = jsondecode(aws_iam_role.github_deploy.assume_role_policy).Statement[0].Condition.StringEquals["token.actions.githubusercontent.com:aud"] == "sts.amazonaws.com"
    error_message = "The deploy role must check the token audience"
  }
}

run "images_are_immutable_and_scanned" {
  command = apply

  assert {
    condition     = alltrue([for r in values(aws_ecr_repository.repo) : r.image_tag_mutability == "IMMUTABLE" && r.image_scanning_configuration[0].scan_on_push])
    error_message = "ECR repositories must be immutable and scan on push"
  }
  assert {
    condition     = toset(keys(aws_ecr_repository.repo)) == toset(["devops-tutor", "devops-tutor-migrate"])
    error_message = "Both the app and migrate repositories must exist"
  }
}

run "runtime_configuration_is_in_ssm" {
  command = apply

  assert {
    condition = alltrue([for name in ["DATABASE_URL", "MIGRATE_DATABASE_URL", "AUTH_SECRET", "AUTH_URL", "MAIL_TRANSPORT", "MAIL_FROM", "AWS_REGION"] :
    contains(keys(aws_ssm_parameter.app), name)])
    error_message = "Every required runtime setting must be published to SSM"
  }
  assert {
    condition     = alltrue([for p in values(aws_ssm_parameter.app) : p.type == "SecureString" && startswith(p.name, "/devops-tutor/prod/")])
    error_message = "Runtime settings must be SecureStrings under /devops-tutor/prod/"
  }
  assert {
    condition     = aws_ssm_parameter.app["AUTH_URL"].value == "https://tutor.example.com"
    error_message = "AUTH_URL must be the public https origin"
  }
}
