package main

import (
	"context"
	"log"
	"os"

	"ppmxbbg-rsvp/handler"
	"ppmxbbg-rsvp/pkg/config"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/joho/godotenv"
)

func init() {
	if err := godotenv.Load(); err != nil {
		if os.Getenv("ENV") != config.EnvProd && os.Getenv("ENV") != config.EnvStaging {
			log.Println("No .env file found or error loading .env")
		}
	}
}

func runningOnLambda() bool {
	return os.Getenv("AWS_LAMBDA_FUNCTION_NAME") != ""
}

func main() {
	if runningOnLambda() {
		lambda.Start(handler.RSVP)
		return
	}

	resp, err := handler.RSVP(context.Background(), events.APIGatewayV2HTTPRequest{
		RequestContext: events.APIGatewayV2HTTPRequestContext{
			HTTP: events.APIGatewayV2HTTPRequestContextHTTPDescription{
				Method: "GET",
			},
		},
		QueryStringParameters: map[string]string{"id": os.Getenv("TEST_GUEST_ID")},
	})
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("status=%d body=%s", resp.StatusCode, resp.Body)
}
