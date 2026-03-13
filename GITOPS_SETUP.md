# GitOps Setup with ArgoCD

This guide explains how to set up GitOps for the MiniSocial application using ArgoCD.

## Prerequisites

- Kubernetes cluster running
- `kubectl` configured
- `git` installed
- GitHub account with repository access

## Step 1: Install ArgoCD

```bash
# Create argocd namespace
kubectl create namespace argocd

# Install ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd
```

## Step 2: Access ArgoCD UI

```bash
# Port forward to access ArgoCD UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Get initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Access at https://localhost:8080
```

## Step 3: Configure Git Repository

1. Push your code to GitHub (or your Git provider)
2. Create a personal access token for authentication
3. Add the repository to ArgoCD via UI or CLI

```bash
# Login to ArgoCD CLI
argocd login localhost:8080 --insecure

# Add repository
argocd repo add https://github.com/YOUR_USERNAME/minisocial.git \
  --username YOUR_USERNAME \
  --password YOUR_TOKEN
```

## Step 4: Create ArgoCD Application

Create an ArgoCD Application manifest that points to your Helm charts or Kustomize files:

```bash
kubectl apply -f argocd-application.yaml
```

## Step 5: Enable Auto-Sync (Optional)

For automatic deployments on Git push, enable auto-sync in the Application manifest.

## Workflow

1. Make code changes locally
2. Commit and push to Git repository
3. ArgoCD detects changes
4. ArgoCD automatically syncs and deploys to Kubernetes
5. Monitor deployment in ArgoCD UI

## Useful Commands

```bash
# List applications
argocd app list

# Sync application
argocd app sync minisocial

# Get application status
argocd app get minisocial

# Delete application
argocd app delete minisocial
```

## Troubleshooting

- Check ArgoCD logs: `kubectl logs -n argocd deployment/argocd-application-controller`
- Check application status: `argocd app get minisocial`
- Verify Git repository access: `argocd repo list`
