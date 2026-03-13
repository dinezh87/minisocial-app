# Cluster Add-ons

These files prepare the core add-ons needed before full GitOps and CI/CD:

- AWS Load Balancer Controller
- metrics-server
- Argo CD bootstrap namespace and base config

## Install Order

1. Apply Terraform and capture:
   - cluster name
   - VPC ID
   - AWS Load Balancer Controller IRSA role ARN
2. Install AWS Load Balancer Controller using the values file in this repo
3. Install metrics-server using the values file in this repo
4. Install Argo CD into the prepared namespace

## Important

The files here are intentionally parameterized with placeholders. Replace:

- cluster name
- VPC ID
- IRSA role ARN
- ingress hostnames

before applying or wiring them into Argo CD.
