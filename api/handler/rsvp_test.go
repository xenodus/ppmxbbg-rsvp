package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/aws/aws-lambda-go/events"
)

func TestRSVPOptions(t *testing.T) {
	resp, err := RSVP(context.Background(), events.APIGatewayProxyRequest{
		HTTPMethod: http.MethodOptions,
		Headers:    map[string]string{"origin": "http://localhost:5173"},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", resp.StatusCode)
	}
}

func TestRSVPGetMissingID(t *testing.T) {
	resp, err := RSVP(context.Background(), events.APIGatewayProxyRequest{
		HTTPMethod: http.MethodGet,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
}

func TestRSVPInvalidMethod(t *testing.T) {
	resp, err := RSVP(context.Background(), events.APIGatewayProxyRequest{
		HTTPMethod: http.MethodDelete,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", resp.StatusCode)
	}
}

func TestRSVPInvalidPostBody(t *testing.T) {
	resp, err := RSVP(context.Background(), events.APIGatewayProxyRequest{
		HTTPMethod: http.MethodPost,
		Body:       "{",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}

	var body errorResponse
	if err := json.Unmarshal([]byte(resp.Body), &body); err != nil {
		t.Fatalf("failed to decode body: %v", err)
	}
	if body.Error == "" {
		t.Fatal("expected error message in body")
	}
}
