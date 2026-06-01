package main

import (
	"context"
	"log"
	"os"

	"ppmxbbg-rsvp/handler"

	"github.com/aws/aws-lambda-go/events"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found or error loading .env")
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
