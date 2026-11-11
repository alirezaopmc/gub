# Multi-stage Dockerfile for GUB Go Game Server
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build statically-linked binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o /gub-server ./cmd/server

# Minimal runtime image
FROM alpine:3.21

RUN apk --no-cache add ca-certificates tzdata && \
    addgroup -S gub && adduser -S gub -G gub

USER gub

WORKDIR /app

COPY --from=builder /gub-server /app/gub-server
# Migrations are embedded in the binary (migrations/embed.go) and run on startup.

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["/app/gub-server"]
