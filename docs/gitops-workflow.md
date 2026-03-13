# GitOps Workflow

This document explains how MiniSocial will use Argo CD and a separate GitOps
repository for continuous deployment.

## Current State

- application repository: local only
- GitOps repository: not yet created remotely
- Argo CD bootstrap files: prepared in this repository
- GitOps repository template: prepared in `deploy/gitops-template`

## Recommended Repository Split

Application repository:

- service source code
- Dockerfiles
- Terraform
- reusable Kubernetes base manifests
- Jenkins pipeline definitions

GitOps repository:

- Argo CD root application
- Argo CD applications per environment
- environment deployment overlays
- image tags promoted by Jenkins

## Continuous Deployment Flow

1. Developer pushes code to the application repository
2. Jenkins builds and tests the changed services
3. Jenkins builds ARM64-compatible images and pushes them to ECR
4. Jenkins updates the image tags in the GitOps repository
5. Jenkins commits and pushes the GitOps change
6. Argo CD detects the GitOps repository change
7. Argo CD syncs the cluster to the desired state

## Why Separate GitOps Repo

- deployment intent is auditable independently of app code
- production promotion is easier to control
- Argo CD only needs read access to deployment manifests
- Jenkins updates Git rather than changing the cluster directly

## What Still Needs To Happen

- create the real GitHub application repository
- create the real GitHub GitOps repository
- replace placeholder repo URLs in the template
- replace the placeholder Kustomize remote base paths so the GitOps repo can
  reference the application repo overlays, for example:
  `github.com/<org>/<app-repo>//deploy/k8s/overlays/staging?ref=main`
- copy `deploy/gitops-template` into the new GitOps repository
- point Argo CD at the new remote repository
