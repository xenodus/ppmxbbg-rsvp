package main

import (
	"context"
	"encoding/json"
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

	raw, err := json.Marshal(events.APIGatewayV2HTTPRequest{
		Version: "2.0",
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

	resp, err := handler.RSVP(context.Background(), raw)
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("response=%s", string(resp))
}
