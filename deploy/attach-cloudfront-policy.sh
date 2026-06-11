#!/usr/bin/env bash
# Attach CloudFront invalidation permissions to the GitHub Actions deploy role.
# Requires AWS CLI credentials with iam:PutRolePolicy on the deploy role.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
POLICY_FILE="$ROOT/deploy/github-actions-cloudfront-policy.json"
POLICY_NAME="${AWS_DEPLOY_CLOUDFRONT_POLICY_NAME:-github-actions-ppmxbbg-rsvp-cloudfront}"

ROLE_NAME="$(make -s -C "$ROOT" print-aws-deploy-role-name)"
ROLE_ARN="$(make -s -C "$ROOT" print-aws-deploy-role-arn)"

echo "Attaching inline policy $POLICY_NAME to $ROLE_ARN"
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "$POLICY_NAME" \
  --policy-document "file://$POLICY_FILE"

echo "Done. Re-run the failed GitHub Actions deploy or: make cloudfront-invalidate"
