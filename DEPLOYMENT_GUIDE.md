# APwhy Deployment System

APwhy includes a built-in deployment service for GitHub repositories.

## Build Strategy

1. **Railpack + Docker (primary)**  
   APwhy tries `railpack build` first, then runs the built image via Docker.
2. **Go fallback (secondary)**  
   If Railpack is unavailable/fails and the repo contains `go.mod`, APwhy falls back to `go build -o app .` and runs the binary directly.

This enables multi-language builds while preserving compatibility with Go-only repos.

## API Endpoints

All deployment endpoints require an authenticated dashboard session and RBAC permissions.

- `POST /api/v1/deploy` (`deploy.write`)
- `GET /api/v1/deploy` (`deploy.read`)
- `GET /api/v1/deploy/{id}` (`deploy.read`)
- `POST /api/v1/deploy/{id}/stop` (`deploy.write`)
- `GET /api/v1/deploy/{id}/logs?lines=50` (`deploy.read`)

### Create Deployment Request

```json
{
  "github_url": "https://github.com/user/repo.git",
  "name": "my-app",
  "branch": "main",
  "env_vars": {
    "PORT": "8080",
    "DATABASE_URL": "postgresql://..."
  }
}
```

`branch` is optional. If omitted, the repository default branch is used.

## Deployment Status

Each deployment includes:

- `id`
- `name`
- `status` (`queued`, `cloning`, `building`, `running`, `failed`, `stopped`)
- `build_system` (`railpack` or `go`)
- `detected_providers` (from `railpack info`, when available)
- `url`
- `logs`
- `error`
- `created_at`, `updated_at`

## Runtime Requirements

### Required Tools

- `git` (clone source)
- `docker` (run Railpack-built images)
- `railpack` (primary multi-language builder)
- `go` (for Go fallback builds)

### Railpack Requirement

Railpack builds require BuildKit. Typical local setup:

```bash
docker run --rm --privileged -d --name buildkit moby/buildkit
export BUILDKIT_HOST='docker-container://buildkit'
```

## Port Management

APwhy allocates from:

- `8081`
- `8082`
- `8083`
- `8084`
- `8085`

If all are in use, deployment creation fails.

## Storage Paths

Deployment working directories are stored under:

- `${APWHY_DEPLOY_BASE_DIR}` if set
- otherwise `${TMPDIR}/deployments` (typically `/tmp/deployments`)

## Limitations

- Public GitHub repositories only
- Deployment state is in-memory (lost on API restart)
- No CPU/memory quotas per deployment
- No automatic TLS/domain provisioning for deployed apps
