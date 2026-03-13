# Jenkins on EKS

This directory contains the Jenkins CI scaffolding for MiniSocial.

## CI Responsibilities

- run build and test stages
- build ARM64-compatible images on ARM64 EKS worker nodes
- push images to Amazon ECR
- update image tags in the GitOps repository
- commit and push the GitOps repository change

## Design Choices

- Jenkins runs inside EKS
- Jenkins uses IRSA for ECR permissions
- Jenkins agents run on ARM64 nodes
- image builds use Kaniko instead of Docker-in-Docker

## Required Inputs Before Use

- real GitHub app repository URL
- real GitHub GitOps repository URL
- GitHub credentials for Jenkins
- Terraform output for `jenkins_role_arn`
- Terraform output for ECR repository URLs

## Files

- `namespace.yaml`: Jenkins namespace
- `serviceaccount.yaml`: Jenkins service account annotated for IRSA
- `helm-values.yaml`: Jenkins Helm chart values
- `Jenkinsfile`: pipeline template
- `update_gitops_images.sh`: helper script to update GitOps kustomizations
