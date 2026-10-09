terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.68"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.9"
    }
  }

  # State lives in an encrypted, versioned S3 bucket created out of band:
  #   terraform init -backend-config=backend.hcl   (see README.md)
  backend "s3" {}
}

provider "aws" {
  default_tags {
    tags = {
      Project   = "devops-tutor"
      ManagedBy = "terraform"
    }
  }
}

# Route 53 health check metrics are only published in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  default_tags {
    tags = {
      Project   = "devops-tutor"
      ManagedBy = "terraform"
    }
  }
}
