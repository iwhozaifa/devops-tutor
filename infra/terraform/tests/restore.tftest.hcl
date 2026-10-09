# The role used by the scheduled restore drill (.github/workflows/restore-drill.yml).

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

run "drill_role_is_scoped_to_drill_instances" {
  command = apply

  assert {
    condition     = jsondecode(aws_iam_role.restore_drill.assume_role_policy).Statement[0].Condition.StringEquals["token.actions.githubusercontent.com:sub"] == "repo:iwhozaifa/devops-tutor:environment:production"
    error_message = "Only the production environment may assume the drill role"
  }
  assert {
    condition = alltrue([
      for s in jsondecode(aws_iam_role_policy.restore_drill.policy).Statement :
      alltrue([for r in flatten([s.Resource]) : !strcontains(r, ":db:") || endswith(r, ":db:devops-tutor-drill-*") || (endswith(r, ":db:devops-tutor") && !contains(flatten([s.Action]), "rds:DeleteDBInstance"))])
    ])
    error_message = "The drill may only delete or modify devops-tutor-drill-* instances, never production"
  }
  assert {
    condition = anytrue([
      for s in jsondecode(aws_iam_role_policy.restore_drill.policy).Statement :
      contains(flatten([s.Action]), "rds:DeleteDBInstance") && flatten([s.Resource]) == ["arn:aws:rds:eu-west-1:123456789012:db:devops-tutor-drill-*"]
    ])
    error_message = "DeleteDBInstance must be limited to drill instances"
  }
  assert {
    condition = anytrue([
      for s in jsondecode(aws_iam_role_policy.restore_drill.policy).Statement :
      contains(flatten([s.Action]), "ssm:SendCommand") && contains(flatten([s.Resource]), aws_instance.app.arn)
    ])
    error_message = "The drill must be able to run its check on the app instance"
  }
}
