# Jenkins CI Workflow

This document defines the Jenkins-based CI flow for MiniSocial on EKS.

## Responsibilities

- run in the EKS cluster
- use IRSA for AWS permissions
- build ARM64 images on ARM64 worker nodes
- push images to ECR
- update the GitOps repository
- let Argo CD handle deployment

## Why Kaniko

Jenkins is running inside Kubernetes, so Kaniko is a safer and simpler image
builder than Docker-in-Docker.

Because the EKS node group is ARM64-based, Kaniko jobs scheduled onto those
nodes will naturally produce ARM64 images from the existing Dockerfiles.

## Pipeline Flow

1. Checkout the application repository
2. Build and push each service image to ECR
3. Clone the GitOps repository
4. Update the environment kustomization with the new image tags
5. Commit and push the GitOps change
6. Argo CD syncs the deployment

## Inputs Jenkins Needs

- GitHub credentials for application and GitOps repos
- ECR repository URLs from Terraform outputs
- Jenkins IRSA role ARN from Terraform outputs
- real public URLs for frontend build args

## Repository Files

- `deploy/jenkins/helm-values.yaml`
- `deploy/jenkins/serviceaccount.yaml`
- `deploy/jenkins/Jenkinsfile`
- `deploy/jenkins/update_gitops_images.sh`
