terraform {
  required_version = ">=1.4"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

module "platform" {
  source = "../.."

  region                   = var.region
  environment              = var.environment
  cluster_name             = var.cluster_name
  cluster_version          = var.cluster_version
  vpc_cidr                 = var.vpc_cidr
  node_instance_type       = var.node_instance_type
  node_architecture        = var.node_architecture
  desired_nodes            = var.desired_nodes
  min_nodes                = var.min_nodes
  max_nodes                = var.max_nodes
  single_nat_gateway       = var.single_nat_gateway
  rds_enabled              = var.rds_enabled
  rds_identifier           = var.rds_identifier
  rds_db_name              = var.rds_db_name
  rds_username             = var.rds_username
  rds_password             = var.rds_password
  rds_engine               = var.rds_engine
  rds_engine_version       = var.rds_engine_version
  rds_instance_class       = var.rds_instance_class
  rds_allocated_storage    = var.rds_allocated_storage
  rds_multi_az             = var.rds_multi_az
  rds_publicly_accessible  = var.rds_publicly_accessible
  rds_skip_final_snapshot  = var.rds_skip_final_snapshot
  deploy_mongodb_incluster = var.deploy_mongodb_incluster
  deploy_mysql_incluster   = var.deploy_mysql_incluster
  deploy_redis_incluster   = var.deploy_redis_incluster
  media_storage_mode       = var.media_storage_mode
  media_bucket_name        = var.media_bucket_name
}

variable "region" { type = string }
variable "environment" { type = string }
variable "cluster_name" { type = string }
variable "cluster_version" { type = string }
variable "vpc_cidr" { type = string }
variable "node_instance_type" { type = string }
variable "node_architecture" { type = string }
variable "desired_nodes" { type = number }
variable "min_nodes" { type = number }
variable "max_nodes" { type = number }
variable "single_nat_gateway" { type = bool }
variable "rds_enabled" { type = bool }
variable "rds_identifier" {
  type    = string
  default = null
}
variable "rds_db_name" { type = string }
variable "rds_username" { type = string }
variable "rds_password" {
  type      = string
  sensitive = true
}
variable "rds_engine" { type = string }
variable "rds_engine_version" {
  type    = string
  default = null
}
variable "rds_instance_class" { type = string }
variable "rds_allocated_storage" { type = number }
variable "rds_multi_az" { type = bool }
variable "rds_publicly_accessible" { type = bool }
variable "rds_skip_final_snapshot" { type = bool }
variable "deploy_mongodb_incluster" { type = bool }
variable "deploy_mysql_incluster" { type = bool }
variable "deploy_redis_incluster" { type = bool }
variable "media_storage_mode" { type = string }
variable "media_bucket_name" {
  type    = string
  default = null
}
