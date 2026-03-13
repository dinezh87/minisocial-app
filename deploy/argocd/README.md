# Argo CD Bootstrap Notes

This directory contains the initial namespace and base configuration used before
we wire the application into a dedicated GitOps repository.

## Recommended Install Flow

1. Install Argo CD into the `argocd` namespace
2. Apply the manifests in this directory
3. Use the template in `deploy/gitops-template` to create the dedicated GitOps
   repository
4. Apply the Argo CD `AppProject` and `Application` resources from that GitOps
   repository

## Why This Is Separate

The reusable GitOps repository template now exists in `deploy/gitops-template`,
but the real GitHub repository still needs to be created and pushed separately.
