package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
)

func TestRSVPOptionsV2(t *testing.T) {
	raw := mustJSON(map[string]any{
		"version":  "2.0",
		"routeKey": "OPTIONS /guest",
		"requestContext": map[string]any{
			"http": map[string]string{"method": "OPTIONS"},
		},
	})

	resp, err := RSVP(context.Background(), raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertStatus(t, resp, http.StatusNoContent)
}

func TestRSVPGetV1(t *testing.T) {
	raw := mustJSON(map[string]any{
		"httpMethod":            "GET",
		"queryStringParameters": map[string]string{},
	})

	resp, err := RSVP(context.Background(), raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertStatus(t, resp, http.StatusBadRequest)
}

func TestRSVPInvalidMethodV2(t *testing.T) {
	raw := mustJSON(map[string]any{
		"version":  "2.0",
		"routeKey": "DELETE /guest",
		"requestContext": map[string]any{
			"http": map[string]string{"method": "DELETE"},
		},
	})

	resp, err := RSVP(context.Background(), raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertStatus(t, resp, http.StatusMethodNotAllowed)
}

func TestRSVPInvalidPostBodyV1(t *testing.T) {
	raw := mustJSON(map[string]any{
		"httpMethod": "POST",
		"body":       "{",
	})

	resp, err := RSVP(context.Background(), raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertStatus(t, resp, http.StatusBadRequest)

	var body map[string]string
	if err := json.Unmarshal(bodyFromResponse(resp), &body); err != nil {
		t.Fatalf("failed to decode body: %v", err)
	}
	if body["error"] == "" {
		t.Fatal("expected error message in body")
	}
}

func mustJSON(v any) []byte {
	raw, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return raw
}

func bodyFromResponse(raw []byte) []byte {
	var v2 struct {
		Body string `json:"body"`
	}
	if err := json.Unmarshal(raw, &v2); err == nil && v2.Body != "" {
		return []byte(v2.Body)
	}
	return raw
}

func assertStatus(t *testing.T, raw []byte, want int) {
	t.Helper()

	var envelope struct {
		StatusCode int `json:"statusCode"`
	}
	if err := json.Unmarshal(raw, &envelope); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if envelope.StatusCode != want {
		t.Fatalf("expected %d, got %d", want, envelope.StatusCode)
	}
}
