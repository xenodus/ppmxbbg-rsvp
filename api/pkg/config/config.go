package config

import (
	"os"
	"strings"
)

const (
	EnvProd    = "prod"
	EnvStaging = "staging"
)

// productionSiteOrigins are always allowed for CORS (custom wedding domain).
var productionSiteOrigins = []string{
	"https://alvinandvivian.rsvp",
	"https://www.alvinandvivian.rsvp",
}

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

	for _, allowed := range productionSiteOrigins {
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
	if !strings.Contains(origin, "amazonaws.com") {
		return false
	}
	if strings.HasPrefix(origin, "https://") || strings.HasPrefix(origin, "http://") {
		if strings.Contains(origin, "ppmxbbg-rsvp-frontend") {
			return true
		}
		return isPathStyleS3Origin(origin)
	}
	return false
}

// isPathStyleS3Origin matches S3 REST path-style hosts (bucket name is in the URL path).
// Example page URL: https://s3.ap-southeast-1.amazonaws.com/ppmxbbg-rsvp-frontend/admin.html
// Browser Origin:   https://s3.ap-southeast-1.amazonaws.com
func isPathStyleS3Origin(origin string) bool {
	if !strings.HasPrefix(origin, "https://") {
		return false
	}
	host := strings.TrimPrefix(origin, "https://")
	if host == "s3.amazonaws.com" {
		return true
	}
	if !strings.HasPrefix(host, "s3.") || !strings.HasSuffix(host, ".amazonaws.com") {
		return false
	}
	// s3.<region>.amazonaws.com (four labels, no bucket prefix)
	parts := strings.Split(host, ".")
	return len(parts) == 4 && parts[0] == "s3" && parts[2] == "amazonaws" && parts[3] == "com"
}
