module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access           = true
  enable_cluster_creator_admin_permissions = true

  cluster_addons = {
    coredns    = {}
    kube-proxy = {}
    vpc-cni    = {}
  }

  eks_managed_node_groups = {
    default = {
      name           = "${local.name_prefix}-ng"
      ami_type       = "AL2023_ARM_64_STANDARD"
      instance_types = [var.node_instance_type]

      min_size     = var.min_nodes
      max_size     = var.max_nodes
      desired_size = var.desired_nodes

      capacity_type = "ON_DEMAND"
      disk_size     = 30

      labels = {
        environment  = var.environment
        architecture = var.node_architecture
      }

      tags = local.tags
    }
  }

  tags = merge(
    local.tags,
    {
      "karpenter.sh/discovery" = var.cluster_name
    }
  )
}
