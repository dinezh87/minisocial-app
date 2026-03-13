#!/bin/bash

# GitOps Setup Script for MiniSocial
# This script automates the ArgoCD installation and configuration

set -e

echo "🚀 MiniSocial GitOps Setup"
echo "=========================="

# Configuration
GITHUB_USERNAME=${1:-"YOUR_USERNAME"}
GITHUB_TOKEN=${2:-"YOUR_TOKEN"}
GITOPS_REPO=${3:-"minisocial-gitops"}
APP_REPO=${4:-"minisocial"}

if [ "$GITHUB_USERNAME" = "YOUR_USERNAME" ]; then
    echo "❌ Please provide GitHub username and token"
    echo "Usage: ./setup-gitops.sh <github_username> <github_token> [gitops_repo] [app_repo]"
    exit 1
fi

echo "📋 Configuration:"
echo "  GitHub Username: $GITHUB_USERNAME"
echo "  GitOps Repo: $GITOPS_REPO"
echo "  App Repo: $APP_REPO"
echo ""

# Step 1: Create ArgoCD namespace
echo "📦 Step 1: Creating ArgoCD namespace..."
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
echo "✅ ArgoCD namespace created"

# Step 2: Install ArgoCD
echo "📦 Step 2: Installing ArgoCD..."
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
echo "⏳ Waiting for ArgoCD to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd
echo "✅ ArgoCD installed"

# Step 3: Get ArgoCD password
echo "📦 Step 3: Retrieving ArgoCD credentials..."
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
echo "✅ ArgoCD Password: $ARGOCD_PASSWORD"

# Step 4: Port forward
echo "📦 Step 4: Setting up port forwarding..."
kubectl port-forward svc/argocd-server -n argocd 8080:443 > /dev/null 2>&1 &
PF_PID=$!
echo "✅ Port forwarding started (PID: $PF_PID)"
sleep 3

# Step 5: Login to ArgoCD
echo "📦 Step 5: Logging in to ArgoCD..."
argocd login localhost:8080 --insecure --username admin --password "$ARGOCD_PASSWORD" --grpc-web
echo "✅ Logged in to ArgoCD"

# Step 6: Add repositories
echo "📦 Step 6: Adding Git repositories..."
argocd repo add "https://github.com/$GITHUB_USERNAME/$APP_REPO.git" \
  --username "$GITHUB_USERNAME" \
  --password "$GITHUB_TOKEN" \
  --upsert
echo "✅ Application repository added"

argocd repo add "https://github.com/$GITHUB_USERNAME/$GITOPS_REPO.git" \
  --username "$GITHUB_USERNAME" \
  --password "$GITHUB_TOKEN" \
  --upsert
echo "✅ GitOps repository added"

# Step 7: Verify repositories
echo "📦 Step 7: Verifying repositories..."
argocd repo list
echo "✅ Repositories verified"

# Step 8: Create AppProject
echo "📦 Step 8: Creating AppProject..."
kubectl apply -f - <<EOF
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: minisocial
  namespace: argocd
spec:
  sourceRepos:
  - 'https://github.com/$GITHUB_USERNAME/$APP_REPO.git'
  - 'https://github.com/$GITHUB_USERNAME/$GITOPS_REPO.git'
  destinations:
  - namespace: 'minisocial'
    server: https://kubernetes.default.svc
  - namespace: 'minisocial-staging'
    server: https://kubernetes.default.svc
  - namespace: 'minisocial-prod'
    server: https://kubernetes.default.svc
EOF
echo "✅ AppProject created"

echo ""
echo "✨ GitOps Setup Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Access ArgoCD UI: https://localhost:8080"
echo "2. Username: admin"
echo "3. Password: $ARGOCD_PASSWORD"
echo ""
echo "4. Create GitOps repository at: https://github.com/$GITHUB_USERNAME/$GITOPS_REPO"
echo "5. Copy deploy/gitops-template to the new repository"
echo "6. Update placeholder values in the GitOps repository"
echo "7. Apply root application: kubectl apply -f bootstrap/argocd/root-application.yaml"
echo ""
echo "📚 Documentation: See GITOPS_IMPLEMENTATION.md"
echo ""
