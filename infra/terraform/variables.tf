variable "domain_name" {
  description = "Public hostname of the app, e.g. tutor.example.com"
  type        = string
}

variable "certificate_arn" {
  description = "ACM certificate for domain_name, in the same region as the ALB"
  type        = string
}

variable "github_repo" {
  description = "owner/name of the GitHub repository allowed to deploy"
  type        = string
}

variable "mail_from" {
  description = "Sender for verification and password reset emails; defaults to no-reply@<domain_name>"
  type        = string
  default     = null
}

variable "vpc_cidr" {
  type    = string
  default = "10.40.0.0/16"
}

variable "instance_type" {
  type    = string
  default = "t3.small"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_allocated_storage_gb" {
  type    = number
  default = 20
}

variable "db_multi_az" {
  description = "Standby replica in a second AZ (roughly doubles the database cost)"
  type        = bool
  default     = false
}

variable "db_backup_retention_days" {
  type    = number
  default = 14

  validation {
    condition     = var.db_backup_retention_days >= 7
    error_message = "Keep at least 7 days of automated backups."
  }
}

variable "log_retention_days" {
  type    = number
  default = 30
}
