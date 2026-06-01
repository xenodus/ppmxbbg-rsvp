package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/aws/aws-lambda-go/events"
)

func v2Request(method string, query map[string]string, body string) events.APIGatewayV2HTTPRequest {
	return events.APIGatewayV2HTTPRequest{
		Body:                  body,
		QueryStringParameters: query,
		RequestContext: events.APIGatewayV2HTTPRequestContext{
			HTTP: events.APIGatewayV2HTTPRequestContextHTTPDescription{
				Method: method,
			},
		},
	}
}

func TestRSVPOptions(t *testing.T) {
	resp, err := RSVP(context.Background(), v2Request(http.MethodOptions, nil, ""))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", resp.StatusCode)
	}
}

func TestRSVPGetMissingID(t *testing.T) {
	resp, err := RSVP(context.Background(), v2Request(http.MethodGet, map[string]string{}, ""))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
}

func TestRSVPInvalidMethod(t *testing.T) {
	resp, err := RSVP(context.Background(), v2Request(http.MethodDelete, nil, ""))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", resp.StatusCode)
	}
}

func TestRSVPInvalidPostBody(t *testing.T) {
	resp, err := RSVP(context.Background(), v2Request(http.MethodPost, nil, "{"))
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
