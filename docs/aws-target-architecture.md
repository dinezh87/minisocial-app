# AWS Target Architecture

This document defines the target AWS architecture for MiniSocial before we
refine the Terraform implementation.

## Constraints

- AWS account type: free-tier account
- Kubernetes platform: Amazon EKS
- Existing container images: ARM64
- One database must use Amazon RDS
- Remaining databases should run in Kubernetes as StatefulSets
- `media-service` currently uses local filesystem storage

## Chosen Architecture

### Region

- Primary region: `us-east-1`

### Networking

- One VPC per environment
- Two public subnets across two Availability Zones
- Two private subnets across two Availability Zones
- Single NAT Gateway for the first production rollout to control cost
- Public ALB for ingress
- Worker nodes in private subnets

### EKS

- One EKS cluster per environment
- Managed node group using Graviton instances for ARM64 compatibility
- Initial node architecture: `arm64`
- Initial production node type: `t4g.medium`
- Initial staging node type: `t4g.small`

### Databases

Use Amazon RDS for:

- PostgreSQL used by `auth-service`

Run inside EKS as StatefulSets for phase 1:

- MongoDB used by `post-service`
- MySQL used by `user-service`
- Redis used by `feed-service` and `notification-service`

### Media Storage

Staging and production:

- `media-service` uses Amazon S3
- access is granted through IRSA

Local development:

- `media-service` may continue to use filesystem storage

## Ingress and Exposure Model

- AWS Load Balancer Controller manages an Application Load Balancer
- Frontend exposed through ALB ingress
- Backend services exposed internally via Kubernetes Services
- Optional later step: Route53 + ACM for DNS and TLS

## Cluster Add-ons

Required:

- AWS Load Balancer Controller
- metrics-server
- Argo CD
- Jenkins

Optional later:

- cert-manager
- external-dns
- External Secrets Operator

## Cost-Aware Defaults

These are intentionally conservative to fit a first EKS rollout:

- one NAT Gateway only
- one managed node group only
- staging desired nodes: `1`
- production desired nodes: `2`
- RDS PostgreSQL instance class target: `db.t4g.micro`

## Service Mapping

- `frontend`: Deployment + Service + Ingress
- `auth-service`: Deployment + Service, connects to RDS PostgreSQL
- `post-service`: Deployment + Service, connects to in-cluster MongoDB
- `media-service`: Deployment + Service + S3-backed object storage
- `user-service`: Deployment + Service, connects to in-cluster MySQL
- `feed-service`: Deployment + Service, connects to in-cluster Redis
- `notification-service`: Deployment + Service, connects to in-cluster Redis
- `mongodb`: StatefulSet + headless Service + PVC
- `mysql`: StatefulSet + headless Service + PVC
- `redis`: StatefulSet + headless Service + PVC

## CI/CD Model

- Application source stays in this repository
- GitOps environment manifests go into a separate repository later
- Jenkins builds and pushes images to ECR
- Jenkins updates image tags in the GitOps repository
- Argo CD syncs those manifest changes into EKS

## What Step 3 Will Use

The next infrastructure refinement should assume:

- ARM64 node groups
- RDS PostgreSQL only
- in-cluster MongoDB, MySQL, and Redis
- single-replica `media-service` with PVC
- ALB-based ingress
