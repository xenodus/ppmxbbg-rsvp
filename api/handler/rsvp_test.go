package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"

	"ppmxbbg-rsvp/pkg/rsvpcutoff"
)

func TestStripAPIStage(t *testing.T) {
	tests := []struct {
		path, stage, want string
	}{
		{"/guest", "prod", "/guest"},
		{"/prod/guest", "prod", "/guest"},
		{"/prod/admin/login", "prod", "/admin/login"},
		{"/guest", "$default", "/guest"},
		{"/$default/guest", "$default", "/$default/guest"},
	}
	for _, tc := range tests {
		if got := stripAPIStage(tc.path, tc.stage); got != tc.want {
			t.Errorf("stripAPIStage(%q, %q) = %q, want %q", tc.path, tc.stage, got, tc.want)
		}
	}
}

func TestRSVPOptionsV2(t *testing.T) {
	raw := mustJSON(map[string]any{
		"version":  "2.0",
		"routeKey": "OPTIONS /guest",
		"rawPath":  "/guest",
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

func TestRSVPGetGuestMissingID(t *testing.T) {
	raw := mustJSON(map[string]any{
		"httpMethod": "GET",
		"path":       "/guest",
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
		"rawPath":  "/guest",
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

func TestRSVPPostAfterCutoff(t *testing.T) {
	prev := rsvpcutoff.Cutoff
	rsvpcutoff.Cutoff = time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC)
	t.Cleanup(func() {
		rsvpcutoff.Cutoff = prev
	})

	raw := mustJSON(map[string]any{
		"httpMethod": "POST",
		"path":       "/guest",
		"body":       `{"id":1,"is_attending":true,"attend_solemnisation":true}`,
	})

	resp, err := RSVP(context.Background(), raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertStatus(t, resp, http.StatusForbidden)

	var body map[string]string
	if err := json.Unmarshal(bodyFromResponse(resp), &body); err != nil {
		t.Fatalf("failed to decode body: %v", err)
	}
	if body["error"] != "rsvp has closed" {
		t.Fatalf("expected rsvp has closed, got %q", body["error"])
	}
}

func TestRSVPPostGuestInvalidBody(t *testing.T) {
	raw := mustJSON(map[string]any{
		"httpMethod": "POST",
		"path":       "/guest",
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

func TestRSVPUnknownPath(t *testing.T) {
	raw := mustJSON(map[string]any{
		"httpMethod": "GET",
		"path":       "/unknown",
	})

	resp, err := RSVP(context.Background(), raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertStatus(t, resp, http.StatusNotFound)
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

func assertHeader(t *testing.T, raw []byte, key, want string) {
	t.Helper()

	var envelope struct {
		Headers map[string]string `json:"headers"`
	}
	if err := json.Unmarshal(raw, &envelope); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if envelope.Headers == nil {
		t.Fatalf("expected header %s, response has no headers", key)
	}
	got := envelope.Headers[key]
	if got == "" {
		got = envelope.Headers[strings.ToLower(key)]
	}
	if got != want {
		t.Fatalf("header %s: got %q, want %q", key, got, want)
	}
}
