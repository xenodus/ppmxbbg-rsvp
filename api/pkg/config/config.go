package config

import "os"

const (
	EnvProd    = "prod"
	EnvStaging = "staging"
)

func GetAllowedOrigins() []string {
	origins := []string{
		os.Getenv("FRONTEND_ORIGIN"),
		"http://localhost:5173",
		"http://localhost:4173",
	}

	if os.Getenv("ENV") == EnvProd {
		if origin := os.Getenv("FRONTEND_ORIGIN"); origin != "" {
			return []string{origin}
		}
	}

	filtered := make([]string, 0, len(origins))
	seen := map[string]struct{}{}
	for _, origin := range origins {
		if origin == "" {
			continue
		}
		if _, ok := seen[origin]; ok {
			continue
		}
		seen[origin] = struct{}{}
		filtered = append(filtered, origin)
	}

	return filtered
}
