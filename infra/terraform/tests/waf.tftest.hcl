# AWS WAF in front of the ALB.

mock_provider "aws" {
  source = "./tests/mocks/aws"
}

mock_provider "aws" {
  alias  = "us_east_1"
  source = "./tests/mocks/aws"
}

mock_provider "random" {
  source = "./tests/mocks/random"
}

variables {
  domain_name     = "tutor.example.com"
  certificate_arn = "arn:aws:acm:eu-west-1:123456789012:certificate/test"
  github_repo     = "iwhozaifa/devops-tutor"
  alarm_email     = "ops@example.com"
}

run "web_acl_protects_the_alb" {
  command = apply

  assert {
    condition     = aws_wafv2_web_acl.main.scope == "REGIONAL" && length(aws_wafv2_web_acl.main.default_action[0].allow) == 1
    error_message = "A regional web ACL must allow by default and block by rule"
  }
  assert {
    condition = (
      aws_wafv2_web_acl_association.alb.resource_arn == aws_lb.main.arn &&
      aws_wafv2_web_acl_association.alb.web_acl_arn == aws_wafv2_web_acl.main.arn
    )
    error_message = "The web ACL must be attached to the ALB"
  }
}

run "aws_managed_rule_groups_are_enabled" {
  command = apply

  assert {
    condition = alltrue([
      for group in ["AWSManagedRulesCommonRuleSet", "AWSManagedRulesKnownBadInputsRuleSet", "AWSManagedRulesAmazonIpReputationList"] :
      anytrue([for r in aws_wafv2_web_acl.main.rule : length(r.statement[0].managed_rule_group_statement) > 0 && r.statement[0].managed_rule_group_statement[0].name == group && r.statement[0].managed_rule_group_statement[0].vendor_name == "AWS"])
    ])
    error_message = "The common, known-bad-inputs and IP reputation managed rule groups must be enabled"
  }
  assert {
    condition = anytrue([
      for r in aws_wafv2_web_acl.main.rule :
      length(r.statement[0].managed_rule_group_statement) > 0 &&
      r.statement[0].managed_rule_group_statement[0].name == "AWSManagedRulesCommonRuleSet" &&
      anytrue([for o in r.statement[0].managed_rule_group_statement[0].rule_action_override : o.name == "SizeRestrictions_BODY" && length(o.action_to_use[0].count) == 1])
    ])
    error_message = "The 8 KB body size rule must only count: exam submissions can be larger"
  }
}

run "auth_endpoints_are_rate_limited_per_ip" {
  command = apply

  assert {
    condition = anytrue([
      for r in aws_wafv2_web_acl.main.rule :
      length(r.statement[0].rate_based_statement) > 0 &&
      r.statement[0].rate_based_statement[0].aggregate_key_type == "IP" &&
      r.statement[0].rate_based_statement[0].limit <= 300 &&
      length(r.action[0].block) == 1
    ])
    error_message = "A blocking per-IP rate rule (<= 300 requests / 5 min) must exist"
  }
  assert {
    condition = anytrue([
      for r in aws_wafv2_web_acl.main.rule :
      length(r.statement[0].rate_based_statement) > 0 &&
      toset([for s in r.statement[0].rate_based_statement[0].scope_down_statement[0].or_statement[0].statement : s.byte_match_statement[0].search_string]) == toset(["/api/auth/", "/login", "/register", "/forgot-password"])
    ])
    error_message = "The rate rule must cover the sign-in, registration and password reset paths"
  }
}

run "blocked_requests_are_logged" {
  command = apply

  assert {
    condition     = startswith(aws_cloudwatch_log_group.waf.name, "aws-waf-logs-")
    error_message = "WAF can only log to log groups named aws-waf-logs-*"
  }
  assert {
    condition     = aws_wafv2_web_acl_logging_configuration.main.resource_arn == aws_wafv2_web_acl.main.arn
    error_message = "Logging must be enabled for the web ACL"
  }
}
