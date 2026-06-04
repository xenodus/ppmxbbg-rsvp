package config

import (
	"os"
	"strings"
)

const (
	EnvProd    = "prod"
	EnvStaging = "staging"
)

// NormalizeOrigin trims space and removes a trailing slash from a browser Origin value.
func NormalizeOrigin(origin string) string {
	origin = strings.TrimSpace(origin)
	return strings.TrimSuffix(origin, "/")
}

func GetAllowedOrigins() []string {
	origins := []string{
		os.Getenv("FRONTEND_ORIGIN"),
		os.Getenv("FRONTEND_ORIGINS"),
		"http://localhost:5173",
		"http://localhost:4173",
	}

	filtered := make([]string, 0, len(origins))
	seen := map[string]struct{}{}
	for _, entry := range origins {
		for _, origin := range strings.Split(entry, ",") {
			origin = NormalizeOrigin(origin)
			if origin == "" {
				continue
			}
			if _, ok := seen[origin]; ok {
				continue
			}
			seen[origin] = struct{}{}
			filtered = append(filtered, origin)
		}
	}

	return filtered
}

// IsOriginAllowed reports whether the API should emit CORS headers for origin.
func IsOriginAllowed(origin string) bool {
	origin = NormalizeOrigin(origin)
	if origin == "" {
		return false
	}

	for _, allowed := range GetAllowedOrigins() {
		if origin == allowed {
			return true
		}
	}

	if strings.HasPrefix(origin, "https://") && strings.HasSuffix(origin, ".cloudfront.net") {
		return true
	}

	return isS3FrontendOrigin(origin)
}

// isS3FrontendOrigin allows REST and static-website endpoints for this project's bucket.
func isS3FrontendOrigin(origin string) bool {
	if !strings.Contains(origin, "ppmxbbg-rsvp-frontend") || !strings.Contains(origin, "amazonaws.com") {
		return false
	}
	return strings.HasPrefix(origin, "https://") || strings.HasPrefix(origin, "http://")
}
