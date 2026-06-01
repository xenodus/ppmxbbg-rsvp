package main

import (
	"context"
	"encoding/json"
	"log"
	"os"

	"ppmxbbg-rsvp/handler"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found or error loading .env")
	}

	raw, err := json.Marshal(map[string]any{
		"version":       "2.0",
		"rawPath":       "/invite",
		"routeKey":      "GET /invite",
		"queryStringParameters": map[string]string{"id": os.Getenv("TEST_INVITE_ID")},
		"requestContext": map[string]any{
			"http": map[string]string{"method": "GET"},
		},
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
