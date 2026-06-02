.PHONY: test api-test frontend-dev frontend-build frontend-update check-vite-api-url \
	docker-build docker-tag docker-push aws-login \
	lambda-update lambda-wait deploy-api deploy-frontend deploy \
	print-aws-deploy-role-arn print-aws-region

# Deploy settings (also used by GitHub Actions).
AWS_REGION ?= ap-southeast-1
AWS_ACCOUNT_ID ?= 206363131200
ECR_REPO_NAME ?= ppmxbbg-rsvp-api
IMAGE_NAME ?= ppmxbbg-rsvp-api
ECR_REGISTRY ?= $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com
ECR_REPO ?= $(ECR_REGISTRY)/$(ECR_REPO_NAME)
LAMBDA_FUNCTION ?= ppmxbbg-rsvp-api
S3_BUCKET ?= ppmxbbg-rsvp-frontend
CLOUDFRONT_DISTRIBUTION_ID ?=
VITE_API_BASE_URL ?= https://s0vujknrw1.execute-api.ap-southeast-1.amazonaws.com
AWS_DEPLOY_ROLE_NAME ?= github-actions-ppmxbbg-rsvp-deploy
AWS_DEPLOY_ROLE_ARN := arn:aws:iam::$(AWS_ACCOUNT_ID):role/$(AWS_DEPLOY_ROLE_NAME)

export AWS_PAGER :=

check-vite-api-url:
ifeq ($(VITE_API_BASE_URL),)
	$(error VITE_API_BASE_URL is empty. Set it in the Makefile)
endif

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
ifneq ($(CLOUDFRONT_DISTRIBUTION_ID),)
	aws cloudfront create-invalidation \
		--distribution-id $(CLOUDFRONT_DISTRIBUTION_ID) \
		--paths "/*"
endif

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

deploy-api: docker-build docker-tag docker-push lambda-update

deploy-frontend: frontend-update

deploy: deploy-api deploy-frontend

print-aws-deploy-role-arn:
	@echo $(AWS_DEPLOY_ROLE_ARN)

print-aws-region:
	@echo $(AWS_REGION)
