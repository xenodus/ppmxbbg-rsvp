package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"testing"

	"ppmxbbg-rsvp/store"
)

func TestAdminLoginSuccess(t *testing.T) {
	t.Setenv("ADMIN_USERNAME", "admin")
	t.Setenv("ADMIN_PASSWORD", "secret")
	t.Setenv("ADMIN_TOKEN_SECRET", "signing")

	raw := mustJSON(map[string]any{
		"httpMethod": "POST",
		"path":       "/admin/login",
		"body":       `{"username":"admin","password":"secret"}`,
	})

	resp, err := RSVP(context.Background(), raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertStatus(t, resp, http.StatusOK)

	var body map[string]string
	if err := json.Unmarshal(bodyFromResponse(resp), &body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if body["token"] == "" {
		t.Fatal("expected token")
	}
}

func TestAdminLoginInvalidCredentials(t *testing.T) {
	t.Setenv("ADMIN_USERNAME", "admin")
	t.Setenv("ADMIN_PASSWORD", "secret")

	raw := mustJSON(map[string]any{
		"httpMethod": "POST",
		"path":       "/admin/login",
		"body":       `{"username":"admin","password":"wrong"}`,
	})

	resp, err := RSVP(context.Background(), raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertStatus(t, resp, http.StatusUnauthorized)
}

func TestAdminInvitesUnauthorized(t *testing.T) {
	t.Setenv("ADMIN_USERNAME", "admin")
	t.Setenv("ADMIN_PASSWORD", "secret")

	raw := mustJSON(map[string]any{
		"httpMethod": "GET",
		"path":       "/admin/invites",
	})

	resp, err := RSVP(context.Background(), raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertStatus(t, resp, http.StatusUnauthorized)
}

func TestAdminLoginWithStagePrefix(t *testing.T) {
	t.Setenv("ADMIN_USERNAME", "admin")
	t.Setenv("ADMIN_PASSWORD", "secret")
	t.Setenv("ADMIN_TOKEN_SECRET", "signing")

	raw := mustJSON(map[string]any{
		"version":  "2.0",
		"routeKey": "POST /admin/login",
		"rawPath":  "/prod/admin/login",
		"body":     `{"username":"admin","password":"secret"}`,
		"requestContext": map[string]any{
			"stage": "prod",
			"http":  map[string]string{"method": "POST"},
		},
	})

	resp, err := RSVP(context.Background(), raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertStatus(t, resp, http.StatusOK)
}

func TestAdminGuestsUnauthorized(t *testing.T) {
	t.Setenv("ADMIN_USERNAME", "admin")
	t.Setenv("ADMIN_PASSWORD", "secret")

	raw := mustJSON(map[string]any{
		"httpMethod": "PATCH",
		"path":       "/admin/guests",
		"body":       `{"id":1,"name":"Jane"}`,
	})

	resp, err := RSVP(context.Background(), raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertStatus(t, resp, http.StatusUnauthorized)
}

func TestAdminPatchGuestInvalidBody(t *testing.T) {
	t.Setenv("ADMIN_USERNAME", "admin")
	t.Setenv("ADMIN_PASSWORD", "secret")
	t.Setenv("ADMIN_TOKEN_SECRET", "signing")

	loginRaw := mustJSON(map[string]any{
		"httpMethod": "POST",
		"path":       "/admin/login",
		"body":       `{"username":"admin","password":"secret"}`,
	})
	loginResp, err := RSVP(context.Background(), loginRaw)
	if err != nil {
		t.Fatalf("login error: %v", err)
	}
	assertStatus(t, loginResp, http.StatusOK)

	var loginBody map[string]string
	if err := json.Unmarshal(bodyFromResponse(loginResp), &loginBody); err != nil {
		t.Fatalf("decode login body: %v", err)
	}

	raw := mustJSON(map[string]any{
		"httpMethod": "PATCH",
		"path":       "/admin/invites",
		"headers": map[string]string{
			"Authorization": "Bearer " + loginBody["token"],
		},
		"body": `{"guest_id":1}`,
	})

	resp, err := RSVP(context.Background(), raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertStatus(t, resp, http.StatusBadRequest)
}

func TestGuestNamePatchFromInvite(t *testing.T) {
	t.Run("guest id and name", func(t *testing.T) {
		patch, ok := guestNamePatchFromInvite(store.AdminInvitePatch{
			ID:      "123",
			GuestID: 5,
			Name:    "Jane",
		})
		if !ok {
			t.Fatal("expected guest name patch")
		}
		if patch.ID != 5 || patch.InviteID != "123" || patch.Name != "Jane" {
			t.Fatalf("unexpected patch: %+v", patch)
		}
	})

	t.Run("invite id and previous name fallback", func(t *testing.T) {
		patch, ok := guestNamePatchFromInvite(store.AdminInvitePatch{
			ID:           "123",
			Name:         "Jane",
			PreviousName: "John",
		})
		if !ok {
			t.Fatal("expected guest name patch")
		}
		if patch.ID != 0 || patch.InviteID != "123" || patch.PreviousName != "John" {
			t.Fatalf("unexpected patch: %+v", patch)
		}
	})

	t.Run("invite update is not guest name patch", func(t *testing.T) {
		sent := true
		_, ok := guestNamePatchFromInvite(store.AdminInvitePatch{
			ID:     "123",
			IsSent: &sent,
			Name:   "Jane",
		})
		if ok {
			t.Fatal("expected invite patch")
		}
	})
}

func TestAdminOptionsV2(t *testing.T) {
	raw := mustJSON(map[string]any{
		"version":  "2.0",
		"routeKey": "OPTIONS /admin/invites",
		"rawPath":  "/admin/invites",
		"headers": map[string]string{
			"origin": "https://d123.cloudfront.net",
		},
		"requestContext": map[string]any{
			"http": map[string]string{"method": "OPTIONS"},
		},
	})

	resp, err := RSVP(context.Background(), raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertStatus(t, resp, http.StatusNoContent)
	assertHeader(t, resp, "Access-Control-Allow-Origin", "https://d123.cloudfront.net")
}

func TestAdminLoginNotConfigured(t *testing.T) {
	os.Unsetenv("ADMIN_USERNAME")
	os.Unsetenv("ADMIN_PASSWORD")

	raw := mustJSON(map[string]any{
		"httpMethod": "POST",
		"path":       "/admin/login",
		"body":       `{"username":"a","password":"b"}`,
	})

	resp, err := RSVP(context.Background(), raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertStatus(t, resp, http.StatusServiceUnavailable)
}
