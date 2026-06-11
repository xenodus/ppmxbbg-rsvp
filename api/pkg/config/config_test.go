package config

import "testing"

func TestNormalizeOrigin(t *testing.T) {
	if got := NormalizeOrigin(" https://example.com/ "); got != "https://example.com" {
		t.Fatalf("got %q", got)
	}
}

func TestGetAllowedOrigins(t *testing.T) {
	t.Setenv("FRONTEND_ORIGIN", "https://a.example.com/")
	t.Setenv("FRONTEND_ORIGINS", "https://b.example.com,https://c.example.com/")

	origins := GetAllowedOrigins()
	want := []string{
		"https://a.example.com",
		"https://b.example.com",
		"https://c.example.com",
		"http://localhost:5173",
		"http://localhost:4173",
	}

	if len(origins) != len(want) {
		t.Fatalf("got %v, want %v", origins, want)
	}
	for i, expected := range want {
		if origins[i] != expected {
			t.Fatalf("got %v, want %v", origins, want)
		}
	}
}

func TestIsOriginAllowed(t *testing.T) {
	t.Setenv("FRONTEND_ORIGIN", "https://wedding.example.com")
	t.Setenv("FRONTEND_ORIGINS", "")

	tests := []struct {
		origin string
		want   bool
	}{
		{"https://wedding.example.com", true},
		{"https://wedding.example.com/", true},
		{"https://alvinandvivian.rsvp", true},
		{"https://www.alvinandvivian.rsvp", true},
		{"https://d123.cloudfront.net", true},
		{"https://ppmxbbg-rsvp-frontend.s3.ap-southeast-1.amazonaws.com", true},
		{"https://s3.ap-southeast-1.amazonaws.com", true},
		{"https://s3.amazonaws.com", true},
		{"http://ppmxbbg-rsvp-frontend.s3-website-ap-southeast-1.amazonaws.com", true},
		{"https://other-bucket.s3.ap-southeast-1.amazonaws.com", false},
		{"http://localhost:5173", true},
		{"https://evil.example.com", false},
		{"", false},
	}

	for _, tc := range tests {
		if got := IsOriginAllowed(tc.origin); got != tc.want {
			t.Fatalf("IsOriginAllowed(%q) = %v, want %v", tc.origin, got, tc.want)
		}
	}
}
