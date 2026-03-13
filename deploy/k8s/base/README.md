# Kubernetes Base Manifests

This base set defines the phase-1 MiniSocial deployment for EKS.

## Included

- namespace
- service accounts
- ConfigMaps
- base64-encoded Secret manifests with placeholder values
- StatefulSets for MongoDB, MySQL, and Redis
- Deployments and Services for all application services
- S3-backed `media-service` configuration
- starter ALB Ingress definition

## Important Notes

- Replace placeholder secret values before applying:
  - `UkVQTEFDRV9NRQ==` is base64 for `REPLACE_ME`
- `auth-service-config` must be patched with the real RDS endpoint
- frontend runtime URLs are build-time concerns in the current image design
- `media-service-config` must be patched with the real S3 bucket name
- the `media-service` service account must be patched with the Terraform output
  for the media-service IRSA role ARN
- secrets should be overridden per environment from the overlays instead of
  editing the shared base file directly
- MongoDB, MySQL, and Redis are intentionally in-cluster for phase 1 to match
  the agreed architecture
