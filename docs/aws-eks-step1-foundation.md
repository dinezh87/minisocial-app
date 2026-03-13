# AWS EKS Foundation Notes

This document captures the agreed starting point before we build Terraform,
Kubernetes manifests, GitOps, and Jenkins CI for MiniSocial.

## Scope for Step 1

- Prepare this local project to become the main application Git repository
- Capture the target AWS/EKS architecture and cost-sensitive decisions
- Create a deployment folder layout that later steps will fill in

## Current Constraints

- AWS account: free tier account
- Runtime target: Amazon EKS
- Container architecture: existing built images are ARM64
- One database should use Amazon RDS
- Remaining databases should run in Kubernetes as StatefulSets
- Media storage is currently local filesystem storage

## Important Cost Note

Amazon EKS itself is not a free-tier service. The EKS control plane and
supporting components like NAT Gateway and load balancers will still incur AWS
charges. As of March 13, 2026, AWS pricing pages show:

- Amazon EKS standard cluster fee: $0.10 per cluster hour
- NAT Gateway in `us-east-1`: $0.045 per hour, plus data processing

Official sources:

- https://aws.amazon.com/eks/pricing/
- https://aws.amazon.com/vpc/pricing/

To keep costs lower, we should prefer:

- one small non-production cluster first
- one managed node group only
- minimal node count while validating
- a single NAT Gateway for the first environment

## Agreed Initial AWS Shape

### EKS

- Region: `us-east-1` unless you want a different one later
- Managed node group should be ARM64-compatible
- Prefer Graviton worker nodes because the current images are ARM64

### Database Placement

Use Amazon RDS for:

- PostgreSQL backing `auth-service`

Use Kubernetes StatefulSets for:

- MongoDB for `post-service`
- MySQL for `user-service`
- Redis for `feed-service` and `notification-service`

Reasoning:

- PostgreSQL is already a natural fit for RDS and is the cleanest managed DB to
  externalize first
- Keeping the remaining data services in-cluster reduces AWS managed-service
  sprawl during the first rollout

## Media Storage Decision

Current state:

- `media-service` uses local storage

For EKS phase 1:

- run `media-service` as a single replica
- mount persistent storage with a PVC
- accept that local filesystem semantics do not scale horizontally

Recommended later improvement:

- move media to S3 and make `media-service` stateless

## Git Repository Strategy

Application repo:

- this repository
- contains service code, Dockerfiles, Terraform, Kubernetes manifests, and CI
  definitions

GitOps repo:

- separate repository to be created later, for example `minisocial-gitops`
- contains environment overlays and image tag updates consumed by Argo CD

Why separate them:

- Jenkins updates deployment intent in Git, not the live cluster
- Argo CD continuously reconciles the cluster from Git
- easier promotion between `staging` and `prod`

## Proposed Branching

- `main`: production-ready application code
- `staging`: pre-production integration branch
- feature branches: short-lived work branches

## Deployment Folder Layout

These directories are created now so we can fill them in during later steps:

- `deploy/k8s/base`
- `deploy/k8s/overlays/staging`
- `deploy/k8s/overlays/prod`
- `deploy/addons`
- `deploy/argocd`
- `deploy/jenkins`

## Next Implementation Step

Step 2 will refine the repository for GitHub and start the deployment assets:

- review and clean Terraform for VPC, EKS, and ECR
- create base Kubernetes manifests for the application
- prepare environment-specific configuration structure
