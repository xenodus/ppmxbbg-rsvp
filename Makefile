.PHONY: test api-test frontend-dev frontend-build frontend-update \
	docker-build docker-tag docker-push aws-login ecr-create \
	lambda-create lambda-update lambda-wait deploy-api deploy-frontend deploy

# Override locally by creating Makefile.include, e.g.:
#   AWS_ACCOUNT_ID=123456789012
#   ECR_REPO_NAME=ppmxbbg-rsvp-api
#   LAMBDA_FUNCTION=ppmxbbg-rsvp-api
#   LAMBDA_ROLE_ARN=arn:aws:iam::123456789012:role/ppmxbbg-rsvp-lambda
#   S3_BUCKET=ppmxbbg-rsvp-frontend
#   CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC
#   VITE_API_BASE_URL=https://abc123.execute-api.ap-southeast-1.amazonaws.com
-include Makefile.include

AWS_REGION ?= ap-southeast-1
AWS_ACCOUNT_ID ?= your-account-id
ECR_REPO_NAME ?= ppmxbbg-rsvp-api
IMAGE_NAME ?= ppmxbbg-rsvp-api
ECR_REGISTRY ?= $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com
ECR_REPO ?= $(ECR_REGISTRY)/$(ECR_REPO_NAME)
LAMBDA_FUNCTION ?= ppmxbbg-rsvp-api
LAMBDA_ROLE_ARN ?=
S3_BUCKET ?= your-rsvp-frontend-bucket
CLOUDFRONT_DISTRIBUTION_ID ?=
VITE_API_BASE_URL ?=

export AWS_PAGER :=

test: api-test

api-test:
	cd api && go test ./...

frontend-dev:
	cd frontend && npm install && npm run dev

frontend-build:
ifneq ($(VITE_API_BASE_URL),)
	echo "VITE_API_BASE_URL=$(VITE_API_BASE_URL)" > frontend/.env
endif
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

ecr-create:
	aws ecr create-repository \
		--repository-name $(ECR_REPO_NAME) \
		--image-scanning-configuration scanOnPush=true \
		--region $(AWS_REGION)

lambda-create:
	@test -n "$(LAMBDA_ROLE_ARN)" || (echo "Set LAMBDA_ROLE_ARN in Makefile.include" && exit 1)
	aws lambda create-function \
		--function-name $(LAMBDA_FUNCTION) \
		--package-type Image \
		--code ImageUri=$(ECR_REPO):latest \
		--role $(LAMBDA_ROLE_ARN) \
		--architectures x86_64 \
		--timeout 30 \
		--memory-size 256 \
		--region $(AWS_REGION)

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
