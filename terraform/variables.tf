variable "region" {
  description = "AWS region for the environment."
  type        = string
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "EKS cluster name."
  type        = string
}

variable "environment" {
  description = "Environment name such as staging or prod."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
}

variable "cluster_version" {
  description = "Kubernetes version for EKS."
  type        = string
  default     = "1.29"
}

variable "node_instance_type" {
  description = "Managed node group instance type."
  type        = string
}

variable "node_architecture" {
  description = "Node architecture label."
  type        = string
  default     = "arm64"
}

variable "desired_nodes" {
  description = "Desired node count."
  type        = number
}

variable "min_nodes" {
  description = "Minimum node count."
  type        = number
}

variable "max_nodes" {
  description = "Maximum node count."
  type        = number
}

variable "single_nat_gateway" {
  description = "Whether to use a single NAT Gateway to reduce cost."
  type        = bool
  default     = true
}

variable "service_names" {
  description = "Application services that need ECR repositories."
  type        = list(string)
  default = [
    "frontend",
    "auth-service",
    "post-service",
    "media-service",
    "user-service",
    "feed-service",
    "notification-service",
  ]
}

variable "rds_enabled" {
  description = "Whether to provision the RDS PostgreSQL instance."
  type        = bool
  default     = true
}

variable "rds_identifier" {
  description = "Identifier for the RDS instance."
  type        = string
  default     = null
}

variable "rds_db_name" {
  description = "Database name for auth-service."
  type        = string
  default     = "authdb"
}

variable "rds_username" {
  description = "Master username for the PostgreSQL database."
  type        = string
  default     = "postgres"
}

variable "rds_password" {
  description = "Master password for the PostgreSQL database."
  type        = string
  sensitive   = true
  default     = null
}

variable "rds_engine" {
  description = "RDS engine."
  type        = string
  default     = "postgres"
}

variable "rds_engine_version" {
  description = "Optional explicit PostgreSQL engine version."
  type        = string
  default     = null
}

variable "rds_instance_class" {
  description = "Instance class for the PostgreSQL database."
  type        = string
  default     = "db.t4g.micro"
}

variable "rds_allocated_storage" {
  description = "Allocated storage in GiB for the PostgreSQL database."
  type        = number
  default     = 20
}

variable "rds_multi_az" {
  description = "Whether the PostgreSQL database should be multi-AZ."
  type        = bool
  default     = false
}

variable "rds_publicly_accessible" {
  description = "Whether the PostgreSQL database should be publicly accessible."
  type        = bool
  default     = false
}

variable "rds_skip_final_snapshot" {
  description = "Whether to skip final snapshot on destroy."
  type        = bool
  default     = true
}

variable "deploy_mongodb_incluster" {
  description = "Reference flag for later Kubernetes StatefulSet deployment."
  type        = bool
  default     = true
}

variable "deploy_mysql_incluster" {
  description = "Reference flag for later Kubernetes StatefulSet deployment."
  type        = bool
  default     = true
}

variable "deploy_redis_incluster" {
  description = "Reference flag for later Kubernetes StatefulSet deployment."
  type        = bool
  default     = true
}

variable "media_storage_mode" {
  description = "Phase-1 media storage mode."
  type        = string
  default     = "s3"
}

variable "media_bucket_name" {
  description = "S3 bucket name used by media-service."
  type        = string
  default     = null
}
