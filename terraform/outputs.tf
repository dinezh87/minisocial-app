output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "cluster_oidc_provider_arn" {
  value = module.eks.oidc_provider_arn
}

output "cluster_oidc_provider_url" {
  value = module.eks.cluster_oidc_issuer_url
}

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "private_subnet_ids" {
  value = module.vpc.private_subnets
}

output "public_subnet_ids" {
  value = module.vpc.public_subnets
}

output "ecr_repository_urls" {
  value = {
    for name, repo in aws_ecr_repository.services : name => repo.repository_url
  }
}

output "auth_rds_endpoint" {
  value = var.rds_enabled ? aws_db_instance.auth[0].endpoint : null
}

output "auth_rds_address" {
  value = var.rds_enabled ? aws_db_instance.auth[0].address : null
}

output "auth_rds_port" {
  value = var.rds_enabled ? aws_db_instance.auth[0].port : null
}

output "aws_load_balancer_controller_role_arn" {
  value = module.aws_load_balancer_controller_irsa_role.iam_role_arn
}

output "jenkins_role_arn" {
  value = module.jenkins_irsa_role.iam_role_arn
}

output "media_bucket_name" {
  value = aws_s3_bucket.media.bucket
}

output "media_service_role_arn" {
  value = module.media_service_irsa_role.iam_role_arn
}
