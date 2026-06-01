.PHONY: test api-test frontend-build frontend-dev deploy

test: api-test

api-test:
	cd api && go test ./...

frontend-dev:
	cd frontend && npm install && npm run dev

frontend-build:
	cd frontend && npm install && npm run build

docker-build:
	docker buildx build --platform linux/amd64 --provenance=false --load -t ppmxbbg-rsvp-api .

# Override these via environment variables or a local Makefile.include
AWS_REGION ?= ap-southeast-1
ECR_REPO ?= your-account.dkr.ecr.$(AWS_REGION).amazonaws.com/ppmxbbg-rsvp-api
LAMBDA_FUNCTION ?= ppmxbbg-rsvp-api
S3_BUCKET ?= your-rsvp-frontend-bucket
CLOUDFRONT_DISTRIBUTION_ID ?=

docker-tag:
	docker tag ppmxbbg-rsvp-api $(ECR_REPO):latest

docker-push:
	docker push $(ECR_REPO):latest

lambda-update:
	aws lambda update-function-code \
		--function-name $(LAMBDA_FUNCTION) \
		--image-uri $(ECR_REPO):latest

frontend-update: frontend-build
	aws s3 sync frontend/dist s3://$(S3_BUCKET) --delete
ifneq ($(CLOUDFRONT_DISTRIBUTION_ID),)
	aws cloudfront create-invalidation --distribution-id $(CLOUDFRONT_DISTRIBUTION_ID) --paths "/*"
endif

aws-login:
	aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(shell echo $(ECR_REPO) | cut -d/ -f1)

deploy: docker-build docker-tag docker-push lambda-update frontend-update
