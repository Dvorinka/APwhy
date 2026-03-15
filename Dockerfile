# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS web-builder
WORKDIR /app
COPY package*.json ./
COPY postcss.config.cjs tailwind.config.cjs tsconfig.json vite.config.ts ./
COPY web ./web
RUN npm ci
RUN npm run build:web

FROM golang:1.25-alpine AS go-builder
WORKDIR /app
RUN apk add --no-cache git
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
COPY --from=web-builder /app/internal/api/static ./internal/api/static
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o /out/apwhy ./cmd/apwhy

FROM golang:1.25-bookworm AS runtime
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl docker.io git \
  && rm -rf /var/lib/apt/lists/*
ARG RAILPACK_VERSION=v0.17.2
RUN curl -fsSL -o /tmp/railpack.tar.gz "https://github.com/railwayapp/railpack/releases/download/${RAILPACK_VERSION}/railpack-${RAILPACK_VERSION}-x86_64-unknown-linux-musl.tar.gz" \
  && tar -xzf /tmp/railpack.tar.gz -C /usr/local/bin railpack \
  && chmod +x /usr/local/bin/railpack \
  && rm -f /tmp/railpack.tar.gz
COPY --from=go-builder /out/apwhy /usr/local/bin/apwhy
ENV PATH="/usr/local/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    APWHY_DEPLOY_BASE_DIR=/data/deployments
RUN mkdir -p /data/deployments
EXPOSE 3001
ENTRYPOINT ["apwhy"]
