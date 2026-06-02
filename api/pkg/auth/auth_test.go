package auth

import (
	"errors"
	"testing"
	"time"
)

func TestIssueAndValidateToken(t *testing.T) {
	t.Setenv("ADMIN_USERNAME", "admin")
	t.Setenv("ADMIN_PASSWORD", "secret-pass")
	t.Setenv("ADMIN_TOKEN_SECRET", "signing-key")

	if err := CheckCredentials("admin", "secret-pass"); err != nil {
		t.Fatalf("credentials: %v", err)
	}
	if err := CheckCredentials("admin", "wrong"); !errors.Is(err, ErrInvalidCredentials) {
		t.Fatalf("expected invalid credentials, got %v", err)
	}

	token, expires, err := IssueToken("admin")
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}
	if expires.Before(time.Now()) {
		t.Fatal("expected future expiry")
	}
	if err := ValidateToken(token); err != nil {
		t.Fatalf("validate: %v", err)
	}
}
