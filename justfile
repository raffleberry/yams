# YAMS — Yet Another Music Server
#
# Common tasks:
#   just            # build the UI and run the server
#   just dev        # run with hot reload (UI + server)
#   just ui         # build the frontend only
#   just test       # run Go tests
#   just build      # compile the binary with the UI embedded

set shell := ["bash", "-uc"]

# List available recipes
default:
    @just --list

# Install frontend dependencies
ui-deps:
    cd ui && bun install

# Build the frontend into ui/dist (embedded by the Go binary)
ui: ui-deps
    cd ui && bun run build

# Type-check the frontend
ui-check: ui-deps
    cd ui && bun run typecheck

# Run the frontend unit tests
ui-test: ui-deps
    cd ui && bun test

# Run the server against the current ui/dist build
run: ui
    go run .

# Development: Vite dev server with HMR + the Go API.
# Open http://localhost:5173 — it proxies /api to the Go server below.
dev:
    #!/usr/bin/env bash
    set -euo pipefail
    go run . &
    SERVER_PID=$!
    trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
    sleep 1
    cd ui && bun run dev

# Build the binary with the frontend embedded
build: ui
    go build -o yams .

# Run the Go test suite.
# Depends on `ui` because the frontend is embedded via go:embed.
test: ui
    go test ./...

# Run every test suite
test-all: test ui-test

# Vet the Go code
vet:
    go vet ./...

# Install the binary to GOPATH/bin
install: ui
    go install .

# Remove the installed binary
uninstall:
    rm -f "$(go env GOPATH)/bin/yams"

# Format Go sources
fmt:
    gofmt -w *.go

# Remove build artifacts
clean:
    rm -f yams
    rm -rf ui/dist

# Remove build artifacts and installed dependencies
distclean: clean
    rm -rf ui/node_modules
