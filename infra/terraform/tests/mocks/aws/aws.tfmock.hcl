# Shared mock data for `terraform test` (see tests/*.tftest.hcl)

mock_data "aws_availability_zones" {
  defaults = { names = ["eu-west-1a", "eu-west-1b", "eu-west-1c"] }
}
mock_data "aws_caller_identity" {
  defaults = { account_id = "123456789012" }
}
mock_data "aws_ssm_parameter" {
  defaults = { value = "ami-0123456789abcdef0" }
}
mock_data "aws_region" {
  defaults = { name = "eu-west-1", region = "eu-west-1" }
}

# Mocked ARNs must be well-formed: the provider validates ARNs it is handed
mock_resource "aws_lb" {
  defaults = { arn = "arn:aws:elasticloadbalancing:eu-west-1:123456789012:loadbalancer/app/devops-tutor/50dc6c495c0c9188", arn_suffix = "app/devops-tutor/50dc6c495c0c9188", dns_name = "devops-tutor-1.eu-west-1.elb.amazonaws.com" }
}
mock_resource "aws_lb_target_group" {
  defaults = { arn = "arn:aws:elasticloadbalancing:eu-west-1:123456789012:targetgroup/devops-tutor/73e2d6bc24d8a067", arn_suffix = "targetgroup/devops-tutor/73e2d6bc24d8a067" }
}
mock_resource "aws_lb_listener" {
  defaults = { arn = "arn:aws:elasticloadbalancing:eu-west-1:123456789012:listener/app/devops-tutor/50dc6c495c0c9188/f2f7dc8efc522ab2" }
}
mock_resource "aws_instance" {
  defaults = { arn = "arn:aws:ec2:eu-west-1:123456789012:instance/i-0123456789abcdef0", id = "i-0123456789abcdef0" }
}
mock_resource "aws_ecr_repository" {
  defaults = { arn = "arn:aws:ecr:eu-west-1:123456789012:repository/devops-tutor" }
}
mock_resource "aws_cloudwatch_log_group" {
  defaults = { arn = "arn:aws:logs:eu-west-1:123456789012:log-group:/devops-tutor/app" }
}
mock_resource "aws_sesv2_email_identity" {
  defaults = { arn = "arn:aws:ses:eu-west-1:123456789012:identity/tutor.example.com" }
}
mock_resource "aws_iam_openid_connect_provider" {
  defaults = { arn = "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com" }
}
mock_resource "aws_iam_role" {
  defaults = { arn = "arn:aws:iam::123456789012:role/devops-tutor" }
}
mock_resource "aws_db_instance" {
  defaults = { arn = "arn:aws:rds:eu-west-1:123456789012:db:devops-tutor", address = "devops-tutor.abc.eu-west-1.rds.amazonaws.com", port = 5432 }
}
mock_resource "aws_sns_topic" {
  defaults = { arn = "arn:aws:sns:eu-west-1:123456789012:devops-tutor-alarms" }
}
