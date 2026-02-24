# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS web-builder
WORKDIR /app
ARG VITE_BASE_PATH=/
ENV VITE_BASE_PATH=$VITE_BASE_PATH
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

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=go-builder /out/apwhy /app/apwhy
EXPOSE 3001
ENTRYPOINT ["/app/apwhy"]
