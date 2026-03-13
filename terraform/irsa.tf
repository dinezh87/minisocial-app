module "aws_load_balancer_controller_irsa_role" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.0"

  role_name                              = "${local.name_prefix}-aws-load-balancer-controller"
  attach_load_balancer_controller_policy = true

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:aws-load-balancer-controller"]
    }
  }

  tags = local.tags
}

data "aws_iam_policy_document" "jenkins_ecr" {
  statement {
    effect = "Allow"
    actions = [
      "ecr:GetAuthorizationToken",
    ]
    resources = ["*"]
  }

  statement {
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeImages",
      "ecr:DescribeRepositories",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:ListImages",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = [for repo in aws_ecr_repository.services : repo.arn]
  }
}

resource "aws_iam_policy" "jenkins_ecr" {
  name        = "${local.name_prefix}-jenkins-ecr"
  description = "Allow Jenkins running on EKS to push images to ECR"
  policy      = data.aws_iam_policy_document.jenkins_ecr.json

  tags = local.tags
}

module "jenkins_irsa_role" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.0"

  role_name = "${local.name_prefix}-jenkins"

  role_policy_arns = {
    ecr = aws_iam_policy.jenkins_ecr.arn
  }

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["jenkins:jenkins"]
    }
  }

  tags = local.tags
}

data "aws_iam_policy_document" "media_service_s3" {
  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = ["${aws_s3_bucket.media.arn}/*"]
  }

  statement {
    effect = "Allow"
    actions = [
      "s3:ListBucket",
    ]
    resources = [aws_s3_bucket.media.arn]
  }
}

resource "aws_iam_policy" "media_service_s3" {
  name        = "${local.name_prefix}-media-service-s3"
  description = "Allow media-service running on EKS to read and write media objects in S3"
  policy      = data.aws_iam_policy_document.media_service_s3.json

  tags = local.tags
}

module "media_service_irsa_role" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.0"

  role_name = "${local.name_prefix}-media-service"

  role_policy_arns = {
    s3 = aws_iam_policy.media_service_s3.arn
  }

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["minisocial:media-service"]
    }
  }

  tags = local.tags
}
