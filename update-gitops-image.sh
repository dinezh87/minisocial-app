#!/bin/bash

# Jenkins GitOps Image Update Script
# This script updates image tags in the GitOps repository after successful builds

set -e

# Configuration
GITOPS_REPO_URL=${1:-"https://github.com/YOUR_USERNAME/minisocial-gitops.git"}
GITOPS_REPO_DIR=${2:-"/tmp/minisocial-gitops"}
SERVICE_NAME=${3:-"frontend"}
IMAGE_TAG=${4:-"latest"}
ENVIRONMENT=${5:-"staging"}
GIT_USER=${6:-"jenkins"}
GIT_EMAIL=${7:-"jenkins@minisocial.local"}

echo "🔄 Updating GitOps Repository"
echo "=============================="
echo "Service: $SERVICE_NAME"
echo "Image Tag: $IMAGE_TAG"
echo "Environment: $ENVIRONMENT"
echo ""

# Clone or update GitOps repository
if [ -d "$GITOPS_REPO_DIR" ]; then
    echo "📦 Updating existing GitOps repository..."
    cd "$GITOPS_REPO_DIR"
    git fetch origin
    git reset --hard origin/main
else
    echo "📦 Cloning GitOps repository..."
    git clone "$GITOPS_REPO_URL" "$GITOPS_REPO_DIR"
    cd "$GITOPS_REPO_DIR"
fi

# Configure git
git config user.name "$GIT_USER"
git config user.email "$GIT_EMAIL"

# Update image tag in kustomization.yaml
KUSTOMIZE_FILE="apps/$ENVIRONMENT/minisocial/kustomization.yaml"

if [ ! -f "$KUSTOMIZE_FILE" ]; then
    echo "❌ Kustomization file not found: $KUSTOMIZE_FILE"
    exit 1
fi

echo "📝 Updating image tag in $KUSTOMIZE_FILE..."

# Update the image tag using kustomize
cd "apps/$ENVIRONMENT/minisocial"

# Create or update kustomization.yaml with new image
cat > kustomization.yaml <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: minisocial

bases:
  - ../../../deploy/k8s/overlays/$ENVIRONMENT

images:
  - name: $SERVICE_NAME
    newTag: $IMAGE_TAG

commonLabels:
  app.kubernetes.io/version: "$IMAGE_TAG"
  deployment.kubernetes.io/timestamp: "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
EOF

cd "$GITOPS_REPO_DIR"

# Check if there are changes
if git diff --quiet; then
    echo "✅ No changes to commit"
    exit 0
fi

# Commit and push
echo "📤 Committing and pushing changes..."
git add .
git commit -m "Update $SERVICE_NAME image tag to $IMAGE_TAG for $ENVIRONMENT"
git push origin main

echo "✅ GitOps repository updated successfully"
echo ""
echo "📊 Changes:"
git log -1 --oneline
echo ""
echo "🔄 ArgoCD will detect this change and sync automatically"
