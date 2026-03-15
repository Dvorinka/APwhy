package analytics

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

type Client struct {
	BaseURL   string
	Username  string
	Password  string
	WebsiteID string
	HTTP      *http.Client

	// JWT token management
	token    string
	tokenExp time.Time
	tokenMu  sync.RWMutex
}

func NewClient(baseURL, username, password, websiteID string) *Client {
	return &Client{
		BaseURL:   baseURL,
		Username:  username,
		Password:  password,
		WebsiteID: websiteID,
		HTTP: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *Client) Enabled() bool {
	return c.BaseURL != "" && c.Username != "" && c.Password != ""
}

func (c *Client) Status(scriptConfigured bool) map[string]any {
	status := map[string]any{
		"enabled":               c.Enabled(),
		"scriptConfigured":      scriptConfigured,
		"baseURLConfigured":     c.BaseURL != "",
		"credentialsConfigured": c.Username != "" && c.Password != "",
		"websiteConfigured":     c.WebsiteID != "",
		"tokenValid":            c.isTokenValid(),
	}

	// Try to authenticate if credentials are provided but no valid token
	if c.Enabled() && !c.isTokenValid() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := c.TestAuth(ctx); err == nil {
			status["tokenValid"] = true
		} else {
			status["authError"] = err.Error()
		}
	}

	if c.Enabled() && c.isTokenValid() {
		status["message"] = "Umami API sync is configured."
		return status
	}

	missing := []string{}
	if c.BaseURL == "" {
		missing = append(missing, "base URL")
	}
	if c.Username == "" || c.Password == "" {
		missing = append(missing, "username/password")
	}
	if !c.isTokenValid() {
		missing = append(missing, "valid JWT token")
	}
	if c.WebsiteID == "" {
		missing = append(missing, "website ID")
	}
	status["message"] = "Umami API sync is disabled. Missing: " + strings.Join(missing, ", ") + "."
	return status
}

// TestAuth attempts to authenticate and returns any error
func (c *Client) TestAuth(ctx context.Context) error {
	if !c.Enabled() {
		return fmt.Errorf("client not enabled - missing credentials (baseURL: %q, username: %q, password: %q)",
			c.BaseURL, c.Username, "***")
	}

	_, err := c.getValidToken(ctx)
	if err != nil {
		return fmt.Errorf("authentication failed: %w", err)
	}

	return nil
}

func (c *Client) FetchTraffic(ctx context.Context, from, to time.Time) (map[string]any, error) {
	if !c.Enabled() {
		return map[string]any{
			"enabled": false,
		}, nil
	}

	token, err := c.getValidToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get auth token: %w", err)
	}

	websiteID := c.WebsiteID
	if websiteID == "" {
		websiteID, err = c.getOrCreateWebsite(ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to get website ID: %w", err)
		}
		c.WebsiteID = websiteID
	}

	u, err := url.Parse(fmt.Sprintf("%s/api/websites/%s/stats", c.BaseURL, websiteID))
	if err != nil {
		return nil, err
	}

	query := u.Query()
	query.Set("startAt", fmt.Sprintf("%d", from.UnixMilli()))
	query.Set("endAt", fmt.Sprintf("%d", to.UnixMilli()))
	u.RawQuery = query.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")

	res, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode >= 400 {
		return nil, fmt.Errorf("umami returned %d", res.StatusCode)
	}

	var payload map[string]any
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return nil, err
	}
	payload["enabled"] = true
	return payload, nil
}

func (c *Client) isTokenValid() bool {
	c.tokenMu.RLock()
	defer c.tokenMu.RUnlock()
	return c.token != "" && time.Now().Before(c.tokenExp)
}

func (c *Client) getValidToken(ctx context.Context) (string, error) {
	if c.isTokenValid() {
		c.tokenMu.RLock()
		defer c.tokenMu.RUnlock()
		return c.token, nil
	}

	return c.refreshToken(ctx)
}

func (c *Client) refreshToken(ctx context.Context) (string, error) {
	loginURL := fmt.Sprintf("%s/api/auth/login", c.BaseURL)
	payload := map[string]string{
		"username": c.Username,
		"password": c.Password,
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, loginURL, strings.NewReader(string(body)))
	if err != nil {
		return "", fmt.Errorf("failed to create login request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	res, err := c.HTTP.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to execute login request: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode != 200 {
		return "", fmt.Errorf("login failed with status %d", res.StatusCode)
	}

	var response map[string]any
	if err := json.NewDecoder(res.Body).Decode(&response); err != nil {
		return "", fmt.Errorf("failed to decode login response: %w", err)
	}

	token, ok := response["token"].(string)
	if !ok {
		return "", fmt.Errorf("no token in login response")
	}

	c.tokenMu.Lock()
	c.token = token
	c.tokenExp = time.Now().Add(23 * time.Hour) // 23 hour expiration
	c.tokenMu.Unlock()

	return token, nil
}

func (c *Client) getOrCreateWebsite(ctx context.Context) (string, error) {
	token, err := c.getValidToken(ctx)
	if err != nil {
		return "", err
	}

	// Try to find existing website
	websitesURL := fmt.Sprintf("%s/api/websites", c.BaseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, websitesURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")

	res, err := c.HTTP.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	if res.StatusCode == 200 {
		var websites []map[string]any
		if err := json.NewDecoder(res.Body).Decode(&websites); err == nil {
			for _, website := range websites {
				if id, ok := website["id"].(string); ok && id != "" {
					return id, nil // Use first available website
				}
			}
		}
	}

	// Create new website
	createURL := fmt.Sprintf("%s/api/websites", c.BaseURL)
	payload := map[string]interface{}{
		"name":   "APwhy Analytics",
		"domain": "apwhy",
	}

	body, _ := json.Marshal(payload)
	req, err = http.NewRequestWithContext(ctx, http.MethodPost, createURL, strings.NewReader(string(body)))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	res, err = c.HTTP.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	if res.StatusCode != 200 {
		return "", fmt.Errorf("failed to create website: %d", res.StatusCode)
	}

	var response map[string]any
	if err := json.NewDecoder(res.Body).Decode(&response); err != nil {
		return "", err
	}

	websiteID, ok := response["id"].(string)
	if !ok {
		return "", fmt.Errorf("no website ID in response")
	}

	return websiteID, nil
}
