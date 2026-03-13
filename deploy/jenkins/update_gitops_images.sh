#!/bin/sh
set -eu

ENVIRONMENT="$1"
IMAGE_TAG="$2"
ECR_FRONTEND="$3"
ECR_AUTH="$4"
ECR_POST="$5"
ECR_MEDIA="$6"
ECR_USER="$7"
ECR_FEED="$8"
ECR_NOTIFICATION="$9"

TARGET_FILE="apps/${ENVIRONMENT}/minisocial/kustomization.yaml"

if [ ! -f "${TARGET_FILE}" ]; then
  echo "GitOps kustomization not found: ${TARGET_FILE}" >&2
  exit 1
fi

sed -i.bak "s|newName: .*REPLACE_WITH_ECR_FRONTEND.*|newName: ${ECR_FRONTEND}|g" "${TARGET_FILE}" || true
sed -i.bak "s|newName: .*REPLACE_WITH_ECR_AUTH.*|newName: ${ECR_AUTH}|g" "${TARGET_FILE}" || true
sed -i.bak "s|newName: .*REPLACE_WITH_ECR_POST.*|newName: ${ECR_POST}|g" "${TARGET_FILE}" || true
sed -i.bak "s|newName: .*REPLACE_WITH_ECR_MEDIA.*|newName: ${ECR_MEDIA}|g" "${TARGET_FILE}" || true
sed -i.bak "s|newName: .*REPLACE_WITH_ECR_USER.*|newName: ${ECR_USER}|g" "${TARGET_FILE}" || true
sed -i.bak "s|newName: .*REPLACE_WITH_ECR_FEED.*|newName: ${ECR_FEED}|g" "${TARGET_FILE}" || true
sed -i.bak "s|newName: .*REPLACE_WITH_ECR_NOTIFICATION.*|newName: ${ECR_NOTIFICATION}|g" "${TARGET_FILE}" || true

awk -v image_tag="${IMAGE_TAG}" '
  /^  - name: frontend$/ { print; getline; print; getline; print "    newTag: " image_tag; next }
  /^  - name: auth-service$/ { print; getline; print; getline; print "    newTag: " image_tag; next }
  /^  - name: post-service$/ { print; getline; print; getline; print "    newTag: " image_tag; next }
  /^  - name: media-service$/ { print; getline; print; getline; print "    newTag: " image_tag; next }
  /^  - name: user-service$/ { print; getline; print; getline; print "    newTag: " image_tag; next }
  /^  - name: feed-service$/ { print; getline; print; getline; print "    newTag: " image_tag; next }
  /^  - name: notification-service$/ { print; getline; print; getline; print "    newTag: " image_tag; next }
  { print }
' "${TARGET_FILE}" > "${TARGET_FILE}.tmp"

mv "${TARGET_FILE}.tmp" "${TARGET_FILE}"
rm -f "${TARGET_FILE}.bak"
