# Role for the monthly restore drill (deploy/restore-drill.sh, run by
# .github/workflows/restore-drill.yml). It can read snapshots and create,
# tag and delete only devops-tutor-drill-* instances; production is
# never writable through it.

locals {
  rds_arn = "arn:aws:rds:${local.region}:${local.account_id}"
}

resource "aws_iam_role" "restore_drill" {
  name = "${local.name}-restore-drill"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:environment:production"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "restore_drill" {
  name = "restore-drill"
  role = aws_iam_role.restore_drill.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "Describe"
        Effect   = "Allow"
        Action   = ["rds:DescribeDBSnapshots", "rds:DescribeDBInstances"]
        Resource = "*" # read-only
      },
      {
        Sid    = "RestoreToDrillInstance"
        Effect = "Allow"
        Action = ["rds:RestoreDBInstanceFromDBSnapshot", "rds:AddTagsToResource"]
        Resource = [
          "${local.rds_arn}:db:${local.name}-drill-*",
          "${local.rds_arn}:snapshot:rds:${local.name}-*",
          "${local.rds_arn}:subgrp:${aws_db_subnet_group.main.name}",
          "${local.rds_arn}:pg:${aws_db_parameter_group.main.name}",
          "${local.rds_arn}:og:*",
        ]
      },
      {
        Sid      = "DeleteDrillInstance"
        Effect   = "Allow"
        Action   = ["rds:DeleteDBInstance"]
        Resource = ["${local.rds_arn}:db:${local.name}-drill-*"]
      },
      {
        Sid    = "VerifyOnAppInstance"
        Effect = "Allow"
        Action = ["ssm:SendCommand"]
        Resource = [
          aws_instance.app.arn,
          "arn:aws:ssm:${local.region}::document/AWS-RunShellScript",
        ]
      },
      {
        Sid      = "ReadVerifyResult"
        Effect   = "Allow"
        Action   = ["ssm:GetCommandInvocation", "ssm:ListCommandInvocations"]
        Resource = "*" # no resource-level permissions for these APIs
      },
    ]
  })
}
