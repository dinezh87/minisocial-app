# MiniSocial GitOps Repository Template

This directory is a template for the separate GitOps repository we will create
later, for example `minisocial-gitops`.

## Purpose

- store environment deployment intent in Git
- let Argo CD continuously reconcile EKS from Git
- let Jenkins update image tags here after successful builds

## Recommended Remote Repository Layout

- `bootstrap/argocd`
- `apps/staging/minisocial`
- `apps/prod/minisocial`

## Flow

1. Jenkins builds and pushes images to ECR
2. Jenkins updates image tags in this GitOps repo
3. Jenkins commits and pushes the changes
4. Argo CD detects the commit and syncs the target cluster

## Current Placeholder Values

Before using this in a real GitHub repository, replace:

- `REPLACE_WITH_GITOPS_REPO_URL`
- `REPLACE_WITH_APP_REPO_KUSTOMIZE_BASE_STAGING`
- `REPLACE_WITH_APP_REPO_KUSTOMIZE_BASE_PROD`
- `REPLACE_WITH_GIT_BRANCH`
- image names and tags
- ingress hostnames and environment-specific config
