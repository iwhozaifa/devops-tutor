# Alarms notify an SNS topic with an email subscription. Every alarm also
# notifies on recovery so a resolved incident is visible without logging in.

resource "aws_sns_topic" "alarms" {
  name = "${local.name}-alarms"
}

resource "aws_sns_topic_subscription" "alarm_email" {
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# Error-level lines of the app's JSON logs, as a metric
resource "aws_cloudwatch_log_metric_filter" "app_errors" {
  name           = "${local.name}-app-errors"
  log_group_name = aws_cloudwatch_log_group.app.name
  pattern        = "{ $.level = \"error\" }"

  metric_transformation {
    name          = "AppErrors"
    namespace     = "DevopsTutor"
    value         = "1"
    default_value = "0"
  }
}

locals {
  alb_dims = { LoadBalancer = aws_lb.main.arn_suffix }
  tg_dims  = { LoadBalancer = aws_lb.main.arn_suffix, TargetGroup = aws_lb_target_group.app.arn_suffix }
  rds_dims = { DBInstanceIdentifier = aws_db_instance.main.identifier }

  alarms = {
    "alb-5xx" = {
      description = "The app returned 5xx responses"
      namespace   = "AWS/ApplicationELB", metric = "HTTPCode_Target_5XX_Count", stat = "Sum"
      dims        = local.alb_dims, op = "GreaterThanThreshold", threshold = 10, period = 300, periods = 1
    }
    "alb-unhealthy-hosts" = {
      description = "The app instance is failing its readiness check"
      namespace   = "AWS/ApplicationELB", metric = "UnHealthyHostCount", stat = "Maximum"
      dims        = local.tg_dims, op = "GreaterThanThreshold", threshold = 0, period = 60, periods = 3
    }
    "alb-latency" = {
      description = "p95 response time above 2 seconds"
      namespace   = "AWS/ApplicationELB", metric = "TargetResponseTime", stat = "p95"
      dims        = local.alb_dims, op = "GreaterThanThreshold", threshold = 2, period = 300, periods = 2
    }
    "ec2-status-check" = {
      description = "The app instance failed an EC2 status check"
      namespace   = "AWS/EC2", metric = "StatusCheckFailed", stat = "Maximum"
      dims        = { InstanceId = aws_instance.app.id }, op = "GreaterThanThreshold", threshold = 0, period = 60, periods = 2
    }
    "rds-cpu" = {
      description = "Database CPU above 80%"
      namespace   = "AWS/RDS", metric = "CPUUtilization", stat = "Average"
      dims        = local.rds_dims, op = "GreaterThanThreshold", threshold = 80, period = 300, periods = 3
    }
    "rds-free-storage" = {
      description = "Database free storage below 2 GiB"
      namespace   = "AWS/RDS", metric = "FreeStorageSpace", stat = "Minimum"
      dims        = local.rds_dims, op = "LessThanThreshold", threshold = 2 * 1024 * 1024 * 1024, period = 300, periods = 1
    }
    "rds-connections" = {
      description = "Database connections near the limit (raise DB_POOL_MAX or the instance class)"
      namespace   = "AWS/RDS", metric = "DatabaseConnections", stat = "Maximum"
      dims        = local.rds_dims, op = "GreaterThanThreshold", threshold = 60, period = 300, periods = 2
    }
    "app-errors" = {
      description = "The app logged errors (see /devops-tutor/app in Logs Insights)"
      namespace   = "DevopsTutor", metric = "AppErrors", stat = "Sum"
      dims        = {}, op = "GreaterThanThreshold", threshold = 5, period = 300, periods = 1
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "this" {
  for_each = local.alarms

  alarm_name          = "${local.name}-${each.key}"
  alarm_description   = each.value.description
  namespace           = each.value.namespace
  metric_name         = each.value.metric
  dimensions          = length(each.value.dims) > 0 ? each.value.dims : null
  statistic           = startswith(each.value.stat, "p") ? null : each.value.stat
  extended_statistic  = startswith(each.value.stat, "p") ? each.value.stat : null
  comparison_operator = each.value.op
  threshold           = each.value.threshold
  period              = each.value.period
  evaluation_periods  = each.value.periods
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]
}

# --- Uptime, checked from outside AWS ---------------------------------------

resource "aws_route53_health_check" "uptime" {
  type              = "HTTPS"
  fqdn              = var.domain_name
  port              = 443
  resource_path     = "/api/health/ready"
  request_interval  = 30
  failure_threshold = 3
  measure_latency   = true
  tags              = { Name = "${local.name}-uptime" }
}

resource "aws_sns_topic" "alarms_us_east_1" {
  provider = aws.us_east_1
  name     = "${local.name}-alarms"
}

resource "aws_sns_topic_subscription" "alarm_email_us_east_1" {
  provider  = aws.us_east_1
  topic_arn = aws_sns_topic.alarms_us_east_1.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

resource "aws_cloudwatch_metric_alarm" "uptime" {
  provider            = aws.us_east_1
  alarm_name          = "${local.name}-uptime"
  alarm_description   = "https://${var.domain_name}/api/health/ready is failing from outside AWS"
  namespace           = "AWS/Route53"
  metric_name         = "HealthCheckStatus"
  dimensions          = { HealthCheckId = aws_route53_health_check.uptime.id }
  statistic           = "Minimum"
  comparison_operator = "LessThanThreshold"
  threshold           = 1
  period              = 60
  evaluation_periods  = 2
  treat_missing_data  = "breaching"
  alarm_actions       = [aws_sns_topic.alarms_us_east_1.arn]
  ok_actions          = [aws_sns_topic.alarms_us_east_1.arn]
}
