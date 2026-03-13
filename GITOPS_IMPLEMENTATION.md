# GitOps Implementation Guide for MiniSocial

This guide walks through setting up GitOps with ArgoCD for automated deployments.

## Architecture Overview

```
Application Repository (minisocial)
├── source code
├── Dockerfiles
├── deploy/k8s/base (reusable manifests)
├── deploy/k8s/overlays (environment-specific)
└── deploy/argocd (bootstrap files)

GitOps Repository (minisocial-gitops) - SEPARATE REPO
├── bootstrap/argocd (root application)
├── apps/staging/minisocial
└── apps/prod/minisocial
```

## Step 1: Prepare Application Repository

Your application repository already has the structure. Ensure these exist:

```bash
# Check existing structure
ls -la deploy/k8s/base/
ls -la deploy/k8s/overlays/
ls -la deploy/argocd/
```

## Step 2: Create Separate GitOps Repository

Create a new GitHub repository called `minisocial-gitops`:

```bash
# Clone the template
cd /tmp
git clone https://github.com/YOUR_USERNAME/minisocial.git minisocial-app
cd minisocial-app

# Copy gitops template to new location
cp -r deploy/gitops-template/* /tmp/minisocial-gitops-content/

# Create new repo and push
cd /tmp/minisocial-gitops-content
git init
git add .
git commit -m "Initial GitOps setup"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/minisocial-gitops.git
git push -u origin main
```

## Step 3: Update Placeholder Values

In your new GitOps repository, replace placeholders:

```bash
# In bootstrap/argocd/root-application.yaml
GITOPS_REPO_URL="https://github.com/YOUR_USERNAME/minisocial-gitops.git"
APP_REPO_URL="https://github.com/YOUR_USERNAME/minisocial.git"

# Replace in all files
find . -type f -name "*.yaml" -exec sed -i "s|REPLACE_WITH_GITOPS_REPO_URL|$GITOPS_REPO_URL|g" {} \;
find . -type f -name "*.yaml" -exec sed -i "s|REPLACE_WITH_APP_REPO_KUSTOMIZE_BASE_STAGING|$APP_REPO_URL//deploy/k8s/overlays/staging?ref=main|g" {} \;
find . -type f -name "*.yaml" -exec sed -i "s|REPLACE_WITH_APP_REPO_KUSTOMIZE_BASE_PROD|$APP_REPO_URL//deploy/k8s/overlays/prod?ref=main|g" {} \;
find . -type f -name "*.yaml" -exec sed -i "s|REPLACE_WITH_GIT_BRANCH|main|g" {} \;

git add .
git commit -m "Update repository URLs"
git push
```

## Step 4: Install ArgoCD

```bash
# Create namespace
kubectl create namespace argocd

# Install ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for deployment
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd

# Get initial password
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
echo "ArgoCD Password: $ARGOCD_PASSWORD"
```

## Step 5: Access ArgoCD

```bash
# Port forward
kubectl port-forward svc/argocd-server -n argocd 8080:443 &

# Access at https://localhost:8080
# Username: admin
# Password: (from step above)
```

## Step 6: Add Git Repository to ArgoCD

```bash
# Login to ArgoCD CLI
argocd login localhost:8080 --insecure --username admin --password $ARGOCD_PASSWORD

# Add application repository
argocd repo add https://github.com/YOUR_USERNAME/minisocial.git \
  --username YOUR_USERNAME \
  --password YOUR_GITHUB_TOKEN

# Add GitOps repository
argocd repo add https://github.com/YOUR_USERNAME/minisocial-gitops.git \
  --username YOUR_USERNAME \
  --password YOUR_GITHUB_TOKEN

# Verify
argocd repo list
```

## Step 7: Bootstrap ArgoCD with Root Application

```bash
# Apply the root application from your GitOps repo
kubectl apply -f https://raw.githubusercontent.com/YOUR_USERNAME/minisocial-gitops/main/bootstrap/argocd/root-application.yaml

# Verify
argocd app list
argocd app get minisocial-root
```

## Step 8: Monitor Deployments

```bash
# Watch ArgoCD sync
argocd app watch minisocial-root

# Check application status
argocd app get minisocial-staging
argocd app get minisocial-prod

# View in UI
# https://localhost:8080
```

## Continuous Deployment Workflow

### When you make code changes:

1. **Push to Application Repository**
   ```bash
   git add .
   git commit -m "Fix profile update issue"
   git push origin main
   ```

2. **Jenkins Pipeline (if configured)**
   - Builds Docker images
   - Pushes to ECR
   - Updates image tags in GitOps repo
   - Commits and pushes to GitOps repo

3. **ArgoCD Detects Changes**
   - Polls GitOps repository every 3 minutes
   - Or webhook triggers immediate sync
   - Syncs cluster to desired state

4. **Deployment Complete**
   - New pods running with updated code
   - Monitor in ArgoCD UI

## Manual Sync (if needed)

```bash
# Sync specific application
argocd app sync minisocial-staging

# Sync with prune (remove resources not in Git)
argocd app sync minisocial-staging --prune

# Hard sync (force reconciliation)
argocd app sync minisocial-staging --hard-refresh
```

## Useful Commands

```bash
# List all applications
argocd app list

# Get detailed status
argocd app get minisocial-staging

# View application logs
argocd app logs minisocial-staging

# Rollback to previous sync
argocd app rollback minisocial-staging

# Delete application
argocd app delete minisocial-staging
```

## Troubleshooting

### Application stuck in "OutOfSync"
```bash
# Check what's different
argocd app diff minisocial-staging

# Force sync
argocd app sync minisocial-staging --force
```

### Repository access denied
```bash
# Verify repository credentials
argocd repo list

# Update repository credentials
argocd repo add https://github.com/YOUR_USERNAME/minisocial-gitops.git \
  --username YOUR_USERNAME \
  --password YOUR_NEW_TOKEN \
  --upsert
```

### Check ArgoCD logs
```bash
# Application controller logs
kubectl logs -n argocd deployment/argocd-application-controller -f

# Server logs
kubectl logs -n argocd deployment/argocd-server -f
```

## Next Steps

1. Create the separate GitOps repository
2. Update placeholder values
3. Install ArgoCD
4. Bootstrap with root application
5. Configure Jenkins to update image tags in GitOps repo
6. Set up webhook for immediate sync on Git push
