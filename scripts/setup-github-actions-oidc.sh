#!/usr/bin/env bash
# One-time AWS setup for GitHub Actions OIDC deploy (merge to master).
# Run with credentials that can create IAM OIDC providers, roles, and policies.
#
# Usage:
#   export AWS_REGION=ap-southeast-1
#   export GITHUB_ORG=xenodus
#   export GITHUB_REPO=ppmxbbg-rsvp
#   export ECR_REPO_NAME=ppmxbbg-rsvp-api
#   export LAMBDA_FUNCTION=ppmxbbg-rsvp-api
#   export S3_BUCKET=ppmxbbg-rsvp-frontend
#   export CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC   # optional; omit to skip invalidation permission
#   ./scripts/setup-github-actions-oidc.sh

set -euo pipefail

: "${AWS_REGION:=ap-southeast-1}"
: "${GITHUB_ORG:=xenodus}"
: "${GITHUB_REPO:=ppmxbbg-rsvp}"
: "${ROLE_NAME:=github-actions-ppmxbbg-rsvp-deploy}"
: "${POLICY_NAME:=github-actions-ppmxbbg-rsvp-deploy}"
: "${ECR_REPO_NAME:=ppmxbbg-rsvp-api}"
: "${LAMBDA_FUNCTION:=ppmxbbg-rsvp-api}"
: "${S3_BUCKET:=ppmxbbg-rsvp-frontend}"

AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
OIDC_PROVIDER_URL="https://token.actions.githubusercontent.com"
OIDC_PROVIDER_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
GITHUB_SUBJECT="repo:${GITHUB_ORG}/${GITHUB_REPO}:pull_request"

echo "AWS account: ${AWS_ACCOUNT_ID}"
echo "Region:      ${AWS_REGION}"
echo "GitHub sub:  ${GITHUB_SUBJECT}"

# 1) GitHub OIDC identity provider (skip if it already exists)
if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "${OIDC_PROVIDER_ARN}" >/dev/null 2>&1; then
  echo "OIDC provider already exists."
else
  echo "Creating OIDC provider..."
  aws iam create-open-id-connect-provider \
    --url "${OIDC_PROVIDER_URL}" \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938fd6efa2149a011f78167e9d1c4eb1c93d07b
fi

# 2) IAM role trust policy (only merged PR workflows on this repo)
TRUST_POLICY="$(mktemp)"
cat >"${TRUST_POLICY}" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "${OIDC_PROVIDER_ARN}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "${GITHUB_SUBJECT}"
        }
      }
    }
  ]
}
EOF

if aws iam get-role --role-name "${ROLE_NAME}" >/dev/null 2>&1; then
  echo "Updating trust policy on existing role ${ROLE_NAME}..."
  aws iam update-assume-role-policy \
    --role-name "${ROLE_NAME}" \
    --policy-document "file://${TRUST_POLICY}"
else
  echo "Creating IAM role ${ROLE_NAME}..."
  aws iam create-role \
    --role-name "${ROLE_NAME}" \
    --description "GitHub Actions deploy for ${GITHUB_ORG}/${GITHUB_REPO} (OIDC)" \
    --assume-role-policy-document "file://${TRUST_POLICY}"
fi
rm -f "${TRUST_POLICY}"

# 3) Deploy permissions (ECR push, Lambda update, S3 sync, optional CloudFront invalidation)
CF_STATEMENT=""
if [[ -n "${CLOUDFRONT_DISTRIBUTION_ID:-}" ]]; then
  CF_STATEMENT=$(cat <<EOF
    ,
    {
      "Sid": "CloudFrontInvalidate",
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::${AWS_ACCOUNT_ID}:distribution/${CLOUDFRONT_DISTRIBUTION_ID}"
    }
EOF
)
fi

DEPLOY_POLICY="$(mktemp)"
cat >"${DEPLOY_POLICY}" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ECRAuth",
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Sid": "ECRPush",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:CompleteLayerUpload",
        "ecr:InitiateLayerUpload",
        "ecr:PutImage",
        "ecr:UploadLayerPart"
      ],
      "Resource": "arn:aws:ecr:${AWS_REGION}:${AWS_ACCOUNT_ID}:repository/${ECR_REPO_NAME}"
    },
    {
      "Sid": "LambdaDeploy",
      "Effect": "Allow",
      "Action": [
        "lambda:GetFunction",
        "lambda:GetFunctionConfiguration",
        "lambda:UpdateFunctionCode"
      ],
      "Resource": "arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:${LAMBDA_FUNCTION}"
    },
    {
      "Sid": "S3Deploy",
      "Effect": "Allow",
      "Action": [
        "s3:DeleteObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::${S3_BUCKET}",
        "arn:aws:s3:::${S3_BUCKET}/*"
      ]
    }
    ${CF_STATEMENT}
  ]
}
EOF

POLICY_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/${POLICY_NAME}"
if aws iam get-policy --policy-arn "${POLICY_ARN}" >/dev/null 2>&1; then
  VERSIONS="$(aws iam list-policy-versions --policy-arn "${POLICY_ARN}" --query 'Versions[?IsDefaultVersion==`false`].VersionId' --output text)"
  for v in ${VERSIONS}; do
    aws iam delete-policy-version --policy-arn "${POLICY_ARN}" --version-id "${v}" || true
  done
  echo "Updating inline policy document for ${POLICY_NAME}..."
  aws iam create-policy-version \
    --policy-arn "${POLICY_ARN}" \
    --policy-document "file://${DEPLOY_POLICY}" \
    --set-as-default
else
  echo "Creating IAM policy ${POLICY_NAME}..."
  POLICY_ARN="$(aws iam create-policy \
    --policy-name "${POLICY_NAME}" \
    --policy-document "file://${DEPLOY_POLICY}" \
    --query Policy.Arn \
    --output text)"
fi
rm -f "${DEPLOY_POLICY}"

aws iam attach-role-policy \
  --role-name "${ROLE_NAME}" \
  --policy-arn "${POLICY_ARN}" 2>/dev/null || true

ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${ROLE_NAME}"

echo ""
echo "Done. Add these GitHub repository variables (Settings → Secrets and variables → Actions → Variables):"
echo "  AWS_DEPLOY_ROLE_ARN=${ROLE_ARN}"
echo "  AWS_REGION=${AWS_REGION}"
echo "  ECR_REPO_NAME=${ECR_REPO_NAME}"
echo "  LAMBDA_FUNCTION=${LAMBDA_FUNCTION}"
echo "  S3_BUCKET=${S3_BUCKET}"
echo "  CLOUDFRONT_DISTRIBUTION_ID=${CLOUDFRONT_DISTRIBUTION_ID:-}"
echo "  VITE_API_BASE_URL=https://YOUR_API_ID.execute-api.${AWS_REGION}.amazonaws.com"
echo ""
echo "Merge a PR into master to trigger deploy."
