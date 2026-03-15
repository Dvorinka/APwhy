package config

import (
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port                  int
	DatabaseURL           string
	DashboardUIBasePath   string
	PublicBaseURL         string
	AllowRootRoutePrefix  bool
	DefaultServiceTimeout time.Duration
	UmamiBaseURL          string
	UmamiAPIKey           string
	UmamiScriptURL        string
	UmamiWebsiteID        string
	TrustedProxyCIDR      string
}

func getenv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func getenvInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func getenvBool(key string, fallback bool) bool {
	value := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	if value == "" {
		return fallback
	}
	return value == "1" || value == "true" || value == "yes"
}

func normalizePathPrefix(value, fallback string) string {
	v := strings.TrimSpace(value)
	if v == "" {
		return fallback
	}
	if !strings.HasPrefix(v, "/") {
		v = "/" + v
	}
	if len(v) > 1 && strings.HasSuffix(v, "/") {
		v = strings.TrimSuffix(v, "/")
	}
	return v
}

func deriveUmamiBaseURL(baseURL, scriptURL string) string {
	if value := strings.TrimRight(strings.TrimSpace(baseURL), "/"); value != "" {
		return value
	}

	raw := strings.TrimSpace(scriptURL)
	if raw == "" {
		return ""
	}

	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return ""
	}

	return strings.TrimRight(parsed.Scheme+"://"+parsed.Host, "/")
}

func Load() Config {
	umamiScriptURL := getenv("UMAMI_SCRIPT_URL", "")

	return Config{
		Port:                 getenvInt("APWHY_PORT", getenvInt("PORT", 3001)),
		DatabaseURL:          getenv("DATABASE_URL", "postgresql://apwhy:apwhy123@localhost:5432/apwhy"),
		DashboardUIBasePath:  normalizePathPrefix(getenv("DASHBOARD_UI_BASE_PATH", "/"), "/"),
		PublicBaseURL:        strings.TrimRight(getenv("APWHY_PUBLIC_BASE_URL", ""), "/"),
		AllowRootRoutePrefix: getenvBool("ALLOW_ROOT_ROUTE_PREFIX", false),
		DefaultServiceTimeout: time.Duration(
			getenvInt("DEFAULT_SERVICE_TIMEOUT_MS", 8000),
		) * time.Millisecond,
		UmamiBaseURL:     deriveUmamiBaseURL(getenv("UMAMI_BASE_URL", ""), umamiScriptURL),
		UmamiAPIKey:      getenv("UMAMI_API_KEY", ""),
		UmamiScriptURL:   umamiScriptURL,
		UmamiWebsiteID:   getenv("UMAMI_WEBSITE_ID", ""),
		TrustedProxyCIDR: getenv("TRUSTED_PROXY_CIDR", ""),
	}
}
