package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"os"
	"strings"
	"time"
)

const tokenTTL = 24 * time.Hour

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInvalidToken       = errors.New("invalid token")
	ErrAdminNotConfigured = errors.New("admin not configured")
)

type tokenPayload struct {
	Sub string `json:"sub"`
	Exp int64  `json:"exp"`
}

func CheckCredentials(username, password string) error {
	wantUser := os.Getenv("ADMIN_USERNAME")
	wantPass := os.Getenv("ADMIN_PASSWORD")
	if wantUser == "" || wantPass == "" {
		return ErrAdminNotConfigured
	}
	if username != wantUser || password != wantPass {
		return ErrInvalidCredentials
	}
	return nil
}

func IssueToken(username string) (string, time.Time, error) {
	secret, err := tokenSecret()
	if err != nil {
		return "", time.Time{}, err
	}

	expires := time.Now().Add(tokenTTL)
	payload, err := json.Marshal(tokenPayload{Sub: username, Exp: expires.Unix()})
	if err != nil {
		return "", time.Time{}, err
	}

	payloadB64 := base64.RawURLEncoding.EncodeToString(payload)
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write([]byte(payloadB64))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return payloadB64 + "." + sig, expires, nil
}

func ValidateToken(token string) error {
	secret, err := tokenSecret()
	if err != nil {
		return err
	}

	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return ErrInvalidToken
	}

	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write([]byte(parts[0]))
	expected := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expected), []byte(parts[1])) {
		return ErrInvalidToken
	}

	raw, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return ErrInvalidToken
	}

	var payload tokenPayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return ErrInvalidToken
	}
	if payload.Exp < time.Now().Unix() || strings.TrimSpace(payload.Sub) == "" {
		return ErrInvalidToken
	}
	return nil
}

func tokenSecret() ([]byte, error) {
	if s := os.Getenv("ADMIN_TOKEN_SECRET"); s != "" {
		return []byte(s), nil
	}
	if s := os.Getenv("ADMIN_PASSWORD"); s != "" {
		return []byte(s), nil
	}
	return nil, ErrAdminNotConfigured
}

func BearerToken(authorization string) string {
	authorization = strings.TrimSpace(authorization)
	const prefix = "Bearer "
	if !strings.HasPrefix(authorization, prefix) {
		return ""
	}
	return strings.TrimSpace(authorization[len(prefix):])
}

func FormatExpires(t time.Time) string {
	return t.UTC().Format(time.RFC3339)
}
