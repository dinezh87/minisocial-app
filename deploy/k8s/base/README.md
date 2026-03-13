# Kubernetes Base Manifests

This base set defines the phase-1 MiniSocial deployment for EKS.

## Included

- namespace
- ConfigMaps
- base64-encoded Secret manifests with placeholder values
- StatefulSets for MongoDB, MySQL, and Redis
- Deployments and Services for all application services
- PVC-backed storage for `media-service`
- starter ALB Ingress definition

## Important Notes

- Replace placeholder secret values before applying:
  - `UkVQTEFDRV9NRQ==` is base64 for `REPLACE_ME`
- `auth-service-config` must be patched with the real RDS endpoint
- frontend runtime URLs are build-time concerns in the current image design
- `MEDIA_PUBLIC_BASE_URL` should be patched per environment to your real media
  hostname
- MongoDB, MySQL, and Redis are intentionally in-cluster for phase 1 to match
  the agreed architecture
