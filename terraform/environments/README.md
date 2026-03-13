# Environment Defaults

The committed `*.tfvars.example` files define the intended environment defaults
for MiniSocial on AWS EKS.

Use them as the baseline when creating your real `terraform.tfvars` files.

## Current Design

- `auth-service` database goes to Amazon RDS PostgreSQL
- MongoDB, MySQL, and Redis stay in-cluster as StatefulSets
- EKS worker nodes should be ARM64-compatible
- production starts with a single NAT Gateway to control cost
- `media-service` uses a PVC in phase 1
