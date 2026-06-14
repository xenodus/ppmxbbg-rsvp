.PHONY: test api-test frontend-dev frontend-build frontend-update cloudfront-invalidate \
	check-vite-api-url api-gateway-routes docker-build docker-tag docker-push aws-login \
	lambda-update lambda-wait deploy-api deploy-frontend deploy \
	print-aws-deploy-role-arn print-aws-region print-site-domain

# Deploy settings (also used by GitHub Actions).
AWS_REGION ?= ap-southeast-1
AWS_ACCOUNT_ID ?= 206363131200
ECR_REPO_NAME ?= ppmxbbg-rsvp-api
IMAGE_NAME ?= ppmxbbg-rsvp-api
ECR_REGISTRY ?= $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com
ECR_REPO ?= $(ECR_REGISTRY)/$(ECR_REPO_NAME)
LAMBDA_FUNCTION ?= ppmxbbg-rsvp-api
S3_BUCKET ?= ppmxbbg-rsvp-frontend
SITE_DOMAIN ?= alvinandvivian.rsvp
CLOUDFRONT_DISTRIBUTION_ID ?= E3LI9C0QOF801H
VITE_API_BASE_URL ?= https://s0vujknrw1.execute-api.ap-southeast-1.amazonaws.com
AWS_DEPLOY_ROLE_NAME ?= github-actions-ppmxbbg-rsvp-deploy
AWS_DEPLOY_ROLE_ARN := arn:aws:iam::$(AWS_ACCOUNT_ID):role/$(AWS_DEPLOY_ROLE_NAME)

export AWS_PAGER :=

check-vite-api-url:
ifeq ($(VITE_API_BASE_URL),)
	$(error VITE_API_BASE_URL is empty. Set it in the Makefile)
endif

# HTTP API id is the subdomain of the execute-api invoke URL.
HTTP_API_ID ?= $(shell echo "$(VITE_API_BASE_URL)" | sed -E 's|https?://([^.]+)\.execute-api\..*|\1|')

# Routes the Lambda handler expects. deploy-api ensures these exist on API Gateway.
API_ROUTES ?= \
	GET /guest \
	POST /guest \
	OPTIONS /guest \
	POST /admin/login \
	OPTIONS /admin/login \
	GET /admin/invites \
	POST /admin/invites \
	PATCH /admin/invites \
	DELETE /admin/invites \
	OPTIONS /admin/invites \
	PATCH /admin/guests \
	OPTIONS /admin/guests

api-gateway-routes: check-vite-api-url
	@API_ID="$(HTTP_API_ID)"; \
	if [ -z "$$API_ID" ] || [ "$$API_ID" = "$(VITE_API_BASE_URL)" ]; then \
	  echo "error: Could not parse HTTP_API_ID from VITE_API_BASE_URL=$(VITE_API_BASE_URL)" >&2; \
	  exit 1; \
	fi; \
	INTEGRATION_ID=$$(aws apigatewayv2 get-integrations --api-id "$$API_ID" --region $(AWS_REGION) \
	  --query 'Items[0].IntegrationId' --output text); \
	if [ -z "$$INTEGRATION_ID" ] || [ "$$INTEGRATION_ID" = "None" ]; then \
	  echo "error: No Lambda integration found for API $$API_ID" >&2; \
	  exit 1; \
	fi; \
	for ROUTE_KEY in $(API_ROUTES); do \
	  EXISTS=$$(aws apigatewayv2 get-routes --api-id "$$API_ID" --region $(AWS_REGION) \
	    --query "Items[?RouteKey=='$$ROUTE_KEY'].RouteId | [0]" --output text); \
	  if [ -z "$$EXISTS" ] || [ "$$EXISTS" = "None" ]; then \
	    echo "Creating route $$ROUTE_KEY on API $$API_ID"; \
	    aws apigatewayv2 create-route --api-id "$$API_ID" --region $(AWS_REGION) \
	      --route-key "$$ROUTE_KEY" --target "integrations/$$INTEGRATION_ID" >/dev/null; \
	  fi; \
	done

test: api-test

api-test:
	cd api && go test ./...

frontend-dev:
	cd frontend && npm install && npm run dev

frontend-build: check-vite-api-url
	echo "VITE_API_BASE_URL=$(VITE_API_BASE_URL)" > frontend/.env
	cd frontend && npm install && npm run build

frontend-update: frontend-build
	aws s3 sync frontend/dist s3://$(S3_BUCKET) --delete --region $(AWS_REGION)
	$(MAKE) cloudfront-invalidate

# Invalidate CloudFront after every frontend deploy so index.html and hashed
# /assets/* files stay in sync. CLOUDFRONT_DISTRIBUTION_ID is optional: when
# empty, resolve the distribution by SITE_DOMAIN alias, then S3_BUCKET origin.
cloudfront-invalidate:
	@DIST_ID="$(CLOUDFRONT_DISTRIBUTION_ID)"; \
	if [ -z "$$DIST_ID" ]; then \
	  DIST_ID=$$(aws cloudfront list-distributions \
	    --query "DistributionList.Items[?Aliases.Items[?@=='$(SITE_DOMAIN)']].Id | [0]" \
	    --output text); \
	fi; \
	if [ -z "$$DIST_ID" ] || [ "$$DIST_ID" = "None" ]; then \
	  DIST_ID=$$(aws cloudfront list-distributions \
	    --query "DistributionList.Items[?contains(join('', Origins.Items[*].DomainName), '$(S3_BUCKET)')].Id | [0]" \
	    --output text); \
	fi; \
	if [ -z "$$DIST_ID" ] || [ "$$DIST_ID" = "None" ]; then \
	  echo "error: Could not resolve CloudFront distribution for $(SITE_DOMAIN) / $(S3_BUCKET). Set CLOUDFRONT_DISTRIBUTION_ID in the Makefile or grant cloudfront:ListDistributions to the deploy role." >&2; \
	  exit 1; \
	fi; \
	echo "Invalidating CloudFront distribution $$DIST_ID (/*)"; \
	aws cloudfront create-invalidation \
	  --distribution-id "$$DIST_ID" \
	  --paths "/*"

docker-build:
	docker buildx build \
		--platform linux/amd64 \
		--provenance=false \
		--load \
		-t $(IMAGE_NAME) .

docker-tag:
	docker tag $(IMAGE_NAME):latest $(ECR_REPO):latest

docker-push: aws-login
	docker push $(ECR_REPO):latest

aws-login:
	aws ecr get-login-password --region $(AWS_REGION) \
		| docker login --username AWS --password-stdin $(ECR_REGISTRY)

lambda-update:
	aws lambda update-function-code \
		--function-name $(LAMBDA_FUNCTION) \
		--image-uri $(ECR_REPO):latest \
		--region $(AWS_REGION) \
		--output text > /dev/null
	$(MAKE) lambda-wait

lambda-wait:
	aws lambda wait function-updated \
		--function-name $(LAMBDA_FUNCTION) \
		--region $(AWS_REGION)

deploy-api: docker-build docker-tag docker-push lambda-update api-gateway-routes

deploy-frontend: frontend-update

deploy: deploy-api deploy-frontend

print-aws-deploy-role-arn:
	@echo $(AWS_DEPLOY_ROLE_ARN)

print-aws-region:
	@echo $(AWS_REGION)

print-site-domain:
	@echo https://$(SITE_DOMAIN)
