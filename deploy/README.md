# Deployment Layout

This directory will hold the Kubernetes, add-on, GitOps, and CI deployment
assets for MiniSocial.

## Planned Structure

- `k8s/base`: common Kubernetes manifests for all services
- `k8s/overlays/staging`: staging-specific overlays
- `k8s/overlays/prod`: production-specific overlays
- `addons`: cluster add-ons such as AWS Load Balancer Controller
- `argocd`: Argo CD bootstrap manifests
- `jenkins`: Jenkins manifests, values, and pipeline references

## Design Decisions

- EKS worker nodes should support ARM64 images
- PostgreSQL will move to Amazon RDS first
- MongoDB, MySQL, and Redis will start as StatefulSets in the cluster
- `media-service` uses S3 in staging and production, while local development
  can still use filesystem storage
