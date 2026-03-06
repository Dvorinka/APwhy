# APwhy

APwhy is a lightweight, self-hosted API routing and management control plane.

It combines:
- API service routing + key protection
- owner-first authentication bootstrap
- role/permission access control
- PostgreSQL control-plane state
- operations + traffic analytics (including Umami API integration)
- standalone Docker deployment with Traefik + Umami

## Why APwhy
APwhy is intentionally memorable and a little funny: every API request eventually asks "why did this happen?". APwhy gives you that answer with routing controls, incidents, usage, and analytics in one place.

## Stack
- Backend: Go (`cmd/apwhy` + `internal/*`)
- Frontend: SolidJS + Tailwind (modular `web/src/features/*`)
- Auth: cookie sessions with rotating refresh tokens
- Passwords: Argon2id hashing
- DB: PostgreSQL
- Deploy: Docker + Traefik + Umami
- Theme: dark modern red UI (no gradients)

## Core Product Flows
### 1) Owner Bootstrap
- `GET /api/v1/bootstrap/status` checks if users exist.
- If no users, `POST /api/v1/auth/register` (or `POST /api/v1/bootstrap/register-owner`) is allowed.
- After first user is created, registration closes permanently.

### 2) Auth + Sessions
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register` (only while bootstrap is open)
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/reset-password`

Sessions are HTTP-only cookies with short-lived access tokens and rotating refresh tokens.

### 3) Access Control
- Roles and permissions are stored in DB.
- Owner/Admin can create users and roles.
- User registration is disabled after bootstrap; users are created by admin flows only.

### 4) API Hub Management
- Services: `GET|POST|PATCH /api/v1/services`, `POST /api/v1/services/:id/validate`
- Databases: `GET|POST|PATCH /api/v1/databases`, `POST /api/v1/databases/:id/validate`
- Keys: `GET|POST|PATCH /api/v1/keys`

### 5) Analytics
- Ops metrics: `GET /api/v1/analytics/ops`
- Traffic metrics: `GET /api/v1/analytics/traffic`
- Client tracking bridge: `POST /api/v1/analytics/events`

### 6) App Deployments
- Deployments: `POST|GET /api/v1/deploy`, `GET /api/v1/deploy/:id`, `POST /api/v1/deploy/:id/stop`, `GET /api/v1/deploy/:id/logs`
- Build strategy: Railpack + Docker first (multi-language support)
- Fallback: Go build/process for repositories containing `go.mod`

APwhy stores operational events locally and can ingest Umami API stats for traffic dashboards.

## Project Layout
```text
cmd/apwhy/main.go
internal/
  api/
  auth/
  rbac/
  gateway/
  analytics/
  storage/
  config/
  telemetry/
web/
  src/features/
migrations/
deploy/
  docker-compose.yml
  traefik/
  umami/
Dockerfile
```

## Local Development
### Prerequisites
- Go 1.25+
- Node 20+
- npm 9+

### Setup
```bash
cp .env.example .env
npm install
```

If you serve the dashboard under a subpath, set both:
- `DASHBOARD_UI_BASE_PATH=/apwhy`
- `VITE_BASE_PATH=/apwhy` (build-time for frontend asset paths)

### Run (API + Web)
```bash
npm run dev
```
- Go API: `http://localhost:3001`
- Web UI: `http://localhost:5173`

### Build
```bash
npm run build
```
- Frontend builds into `internal/api/static` (embedded by Go server)
- Binary output: `./bin/apwhy`

### Start Binary
```bash
npm run start
```

## Docker (Standalone)
Use the full self-hosted stack (APwhy + Traefik + Umami + Postgres for Umami):

```bash
cd deploy
docker compose up -d --build
```

Default routes:
- APwhy: `http://apwhy.localhost`
- Umami: `http://umami.localhost`
- Traefik dashboard: `http://localhost:8080`

Update `.env` for real domains and secrets before production.

## Hooking Protected Services
1. Add your API/service in the `Services` tab (upstream URL + route prefix).
2. Create API keys in the `Keys` tab and share the raw key with clients.
3. Send requests to APwhy with your configured API key header (`x-api-key` by default).
4. APwhy enforces key validity, service scope, per-minute limits, and monthly quotas before proxying upstream.

## Production Notes
- Set `COOKIE_SECURE=true` behind HTTPS.
- Rotate Umami and app secrets.
- Backup `apwhy-data` volume (SQLite).
- Restrict Traefik dashboard exposure.
- Use strong owner credentials and least-privilege roles.

## backend-dist explanation
`backend-dist/` was the old TypeScript compiled backend output.
APwhy now runs on Go and no longer depends on that runtime artifact.
