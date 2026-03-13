# GitOps Quick Start Guide

## Overview

This guide provides a quick way to set up GitOps with ArgoCD for MiniSocial. The setup uses a separate GitOps repository to manage deployments.

## Prerequisites

- Kubernetes cluster (EKS, minikube, etc.)
- `kubectl` configured
- `argocd` CLI installed
- GitHub account with personal access token
- Git installed locally

## Quick Setup (5 minutes)

### 1. Install ArgoCD

```bash
# Create namespace and install
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for deployment
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd

# Get password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

### 2. Access ArgoCD UI

```bash
# Port forward
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Open browser: https://localhost:8080
# Username: admin
# Password: (from above)
```

### 3. Create GitOps Repository

```bash
# Create new GitHub repository: minisocial-gitops

# Clone and setup
git clone https://github.com/YOUR_USERNAME/minisocial.git
cd minisocial
cp -r deploy/gitops-template /tmp/minisocial-gitops-setup
cd /tmp/minisocial-gitops-setup

# Update URLs (replace YOUR_USERNAME)
sed -i 's|REPLACE_WITH_GITOPS_REPO_URL|https://github.com/YOUR_USERNAME/minisocial-gitops.git|g' bootstrap/argocd/root-application.yaml
sed -i 's|REPLACE_WITH_APP_REPO_KUSTOMIZE_BASE_STAGING|https://github.com/YOUR_USERNAME/minisocial//deploy/k8s/overlays/staging?ref=main|g' apps/staging/minisocial/kustomization.yaml
sed -i 's|REPLACE_WITH_APP_REPO_KUSTOMIZE_BASE_PROD|https://github.com/YOUR_USERNAME/minisocial//deploy/k8s/overlays/prod?ref=main|g' apps/prod/minisocial/kustomization.yaml

# Push to new repository
git init
git add .
git commit -m "Initial GitOps setup"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/minisocial-gitops.git
git push -u origin main
```

### 4. Configure ArgoCD

```bash
# Login
argocd login localhost:8080 --insecure --username admin --password YOUR_PASSWORD

# Add repositories
argocd repo add https://github.com/YOUR_USERNAME/minisocial.git \
  --username YOUR_USERNAME \
  --password YOUR_GITHUB_TOKEN

argocd repo add https://github.com/YOUR_USERNAME/minisocial-gitops.git \
  --username YOUR_USERNAME \
  --password YOUR_GITHUB_TOKEN

# Verify
argocd repo list
```

### 5. Bootstrap ArgoCD

```bash
# Apply root application
kubectl apply -f https://raw.githubusercontent.com/YOUR_USERNAME/minisocial-gitops/main/bootstrap/argocd/root-application.yaml

# Check status
argocd app list
argocd app get minisocial-root
```

## Deployment Workflow

### Making Code Changes

```bash
# 1. Make changes to application code
cd minisocial
# ... edit files ...

# 2. Commit and push
git add .
git commit -m "Fix profile update issue"
git push origin main

# 3. Jenkins builds and pushes image (if configured)
# 4. Jenkins updates GitOps repo with new image tag
# 5. ArgoCD detects change and syncs
# 6. New pods running with updated code
```

### Manual Sync

```bash
# Sync specific application
argocd app sync minisocial-staging

# Watch sync progress
argocd app watch minisocial-staging

# Check status
argocd app get minisocial-staging
```

## File Structure

```
minisocial (Application Repository)
├── deploy/
│   ├── k8s/
│   │   ├── base/              # Reusable manifests
│   │   └── overlays/
│   │       ├── staging/       # Staging-specific
│   │       └── prod/          # Production-specific
│   ├── argocd/                # Bootstrap files
│   └── gitops-template/       # Template for GitOps repo
├── auth-service/
├── frontend/
├── post-service/
└── ... other services

minisocial-gitops (GitOps Repository - SEPARATE)
├── bootstrap/
│   └── argocd/
│       ├── root-application.yaml
│       ├── project.yaml
│       └── apps/
├── apps/
│   ├── staging/
│   │   └── minisocial/
│   │       └── kustomization.yaml
│   └── prod/
│       └── minisocial/
│           └── kustomization.yaml
└── README.md
```

## Common Tasks

### View Application Status

```bash
# List all applications
argocd app list

# Get detailed status
argocd app get minisocial-staging

# View application logs
argocd app logs minisocial-staging
```

### Update Image Tags

```bash
# Manual update (for testing)
cd minisocial-gitops
cd apps/staging/minisocial

# Edit kustomization.yaml
# Update image tag under 'images' section

git add .
git commit -m "Update frontend image to v1.2.3"
git push origin main

# ArgoCD will sync automatically
```

### Rollback Deployment

```bash
# Rollback to previous sync
argocd app rollback minisocial-staging

# Or manually revert Git commit
cd minisocial-gitops
git revert HEAD
git push origin main
```

### Delete Application

```bash
argocd app delete minisocial-staging
```

## Troubleshooting

### Application OutOfSync

```bash
# Check differences
argocd app diff minisocial-staging

# Force sync
argocd app sync minisocial-staging --force
```

### Repository Access Issues

```bash
# Verify repository credentials
argocd repo list

# Update credentials
argocd repo add https://github.com/YOUR_USERNAME/minisocial-gitops.git \
  --username YOUR_USERNAME \
  --password YOUR_NEW_TOKEN \
  --upsert
```

### Check ArgoCD Logs

```bash
# Application controller
kubectl logs -n argocd deployment/argocd-application-controller -f

# Server
kubectl logs -n argocd deployment/argocd-server -f

# Repo server
kubectl logs -n argocd deployment/argocd-repo-server -f
```

## Next Steps

1. ✅ Install ArgoCD
2. ✅ Create GitOps repository
3. ✅ Configure repositories
4. ✅ Bootstrap with root application
5. ⏭️ Configure Jenkins for automated image updates
6. ⏭️ Set up webhook for immediate sync
7. ⏭️ Configure production environment

## Documentation

- Full guide: `GITOPS_IMPLEMENTATION.md`
- Setup script: `setup-gitops.sh`
- Image update script: `update-gitops-image.sh`
- Workflow details: `docs/gitops-workflow.md`

## Support

For issues or questions, refer to:
- ArgoCD Documentation: https://argo-cd.readthedocs.io/
- Kustomize Documentation: https://kustomize.io/
- Kubernetes Documentation: https://kubernetes.io/docs/
