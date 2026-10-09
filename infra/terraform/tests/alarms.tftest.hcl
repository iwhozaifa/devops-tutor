# Alarms and uptime monitoring, notifying an email subscription.

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

run "alarms_notify_the_ops_email" {
  command = apply

  assert {
    condition     = aws_sns_topic_subscription.alarm_email.protocol == "email" && aws_sns_topic_subscription.alarm_email.endpoint == "ops@example.com"
    error_message = "Alarms must notify the configured email address"
  }
  assert {
    condition = alltrue([
      for a in values(aws_cloudwatch_metric_alarm.this) :
      contains(a.alarm_actions, aws_sns_topic.alarms.arn) && contains(a.ok_actions, aws_sns_topic.alarms.arn)
    ])
    error_message = "Every alarm must notify on ALARM and on recovery"
  }
}

run "the_important_signals_are_watched" {
  command = apply

  assert {
    condition = toset(keys(aws_cloudwatch_metric_alarm.this)) == toset([
      "alb-5xx", "alb-unhealthy-hosts", "alb-latency", "ec2-status-check",
      "rds-cpu", "rds-free-storage", "rds-connections", "app-errors",
    ])
    error_message = "Alarms must cover ALB errors/health/latency, the instance, the database and app errors"
  }
  assert {
    condition = (
      aws_cloudwatch_metric_alarm.this["alb-unhealthy-hosts"].metric_name == "UnHealthyHostCount" &&
      aws_cloudwatch_metric_alarm.this["alb-unhealthy-hosts"].threshold == 0 &&
      aws_cloudwatch_metric_alarm.this["alb-unhealthy-hosts"].comparison_operator == "GreaterThanThreshold"
    )
    error_message = "Any unhealthy target must alarm"
  }
  assert {
    condition = (
      aws_cloudwatch_metric_alarm.this["rds-free-storage"].metric_name == "FreeStorageSpace" &&
      aws_cloudwatch_metric_alarm.this["rds-free-storage"].comparison_operator == "LessThanThreshold" &&
      aws_cloudwatch_metric_alarm.this["rds-free-storage"].threshold >= 2 * 1024 * 1024 * 1024
    )
    error_message = "Low database storage (< 2 GiB) must alarm"
  }
}

run "app_errors_are_counted_from_the_json_logs" {
  command = apply

  assert {
    condition = (
      aws_cloudwatch_log_metric_filter.app_errors.log_group_name == aws_cloudwatch_log_group.app.name &&
      aws_cloudwatch_log_metric_filter.app_errors.pattern == "{ $.level = \"error\" }"
    )
    error_message = "Error-level JSON log lines must feed a metric"
  }
  assert {
    condition     = aws_cloudwatch_metric_alarm.this["app-errors"].metric_name == aws_cloudwatch_log_metric_filter.app_errors.metric_transformation[0].name
    error_message = "The app-errors alarm must watch the log metric"
  }
}

run "uptime_is_checked_from_outside_aws" {
  command = apply

  assert {
    condition = (
      aws_route53_health_check.uptime.type == "HTTPS" &&
      aws_route53_health_check.uptime.fqdn == "tutor.example.com" &&
      aws_route53_health_check.uptime.resource_path == "/api/health/ready"
    )
    error_message = "An external HTTPS health check must probe the readiness endpoint"
  }
  assert {
    condition = (
      aws_cloudwatch_metric_alarm.uptime.namespace == "AWS/Route53" &&
      aws_cloudwatch_metric_alarm.uptime.metric_name == "HealthCheckStatus" &&
      contains(aws_cloudwatch_metric_alarm.uptime.alarm_actions, aws_sns_topic.alarms_us_east_1.arn)
    )
    error_message = "The uptime check must alarm (Route 53 metrics live in us-east-1)"
  }
}
