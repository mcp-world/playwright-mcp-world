# Playwright MCP Makefile
# Provides consistent build, test, and deployment targets

.PHONY: help build clean test lint install docker-build docker-test docker-server docker-cleanup dev watch

# Default target
.DEFAULT_GOAL := help

# Variables
NODE_VERSION := 18
DOCKER_IMAGE := playwright-mcp
DOCKER_DEV_IMAGE := playwright-mcp-dev
TEST_RESULTS_DIR := test-results

## Help - Show this help message
help:
	@echo "Playwright MCP - Available Make targets:"
	@echo ""
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## /  /' | column -t -s '-'
	@echo ""
	@echo "Examples:"
	@echo "  make install          # Install dependencies"
	@echo "  make build            # Build the project" 
	@echo "  make test             # Run all tests"
	@echo "  make docker-test      # Run tests in Docker"
	@echo "  make dev              # Start development mode"

## Install - Install Node.js dependencies
install:
	npm ci

## Build - Compile TypeScript to JavaScript
build: install
	npm run build

## Clean - Remove build artifacts and dependencies
clean:
	rm -rf lib/
	rm -rf node_modules/
	rm -rf $(TEST_RESULTS_DIR)/
	rm -rf .nyc_output/
	docker rmi $(DOCKER_IMAGE):latest $(DOCKER_DEV_IMAGE):latest 2>/dev/null || true

## Lint - Run ESLint and TypeScript type checking
lint: build
	npm run update-readme
	npx eslint .
	npx tsc --noEmit

## Test - Run all Playwright tests
test: build
	mkdir -p $(TEST_RESULTS_DIR)
	npm test

## Test-chrome - Run tests on Chrome only
test-chrome: build
	mkdir -p $(TEST_RESULTS_DIR)
	npm run ctest

## Test-firefox - Run tests on Firefox only
test-firefox: build
	mkdir -p $(TEST_RESULTS_DIR)
	npm run ftest

## Test-webkit - Run tests on WebKit only
test-webkit: build
	mkdir -p $(TEST_RESULTS_DIR)
	npm run wtest

## Dev - Start development mode with file watching
dev: install
	npm run watch

## Watch - Alias for dev target
watch: dev

## Docker-build - Build Docker images for production and development
docker-build:
	@echo "Building production Docker image..."
	docker build -f Dockerfile -t $(DOCKER_IMAGE):latest .
	@echo "Building development Docker image..."
	docker build -f Dockerfile.dev -t $(DOCKER_DEV_IMAGE):latest .

## Docker-test - Run tests in Docker containers
docker-test: docker-build
	@echo "Running tests in Docker..."
	mkdir -p $(TEST_RESULTS_DIR)
	docker-compose run --rm test-runner

## Docker-server - Start MCP server in Docker for manual testing
docker-server: docker-build
	@echo "Starting MCP server in Docker (headless mode)..."
	@echo "Use Ctrl+C to stop the server"
	docker-compose run --rm --service-ports $(DOCKER_DEV_IMAGE)

## Docker-cleanup - Clean up Docker containers and images
docker-cleanup:
	@echo "Cleaning up Docker resources..."
	docker-compose down -v --remove-orphans 2>/dev/null || true
	docker rmi $(DOCKER_IMAGE):latest $(DOCKER_DEV_IMAGE):latest 2>/dev/null || true
	docker system prune -f

## Docker-shell - Start an interactive shell in the development container
docker-shell: docker-build
	docker run --rm -it -v $(PWD):/app -w /app $(DOCKER_DEV_IMAGE):latest /bin/bash

## CI - Run full CI pipeline (lint, build, test)
ci: clean install lint test
	@echo "✅ CI pipeline completed successfully"

## Docker-ci - Run full CI pipeline in Docker
docker-ci: docker-build docker-test
	@echo "✅ Docker CI pipeline completed successfully"

## Release - Prepare for release (build, test, lint)
release: clean install lint build test
	@echo "✅ Release preparation completed"
	@echo "Run 'npm publish' to publish to npm registry"

## Check-deps - Check for outdated dependencies
check-deps:
	npm outdated

## Update-deps - Update dependencies to latest versions
update-deps:
	npm update
	npm audit fix

## Serve - Serve the MCP server locally for development
serve: build
	node cli.js --browser chromium --headless

## Debug - Start the MCP server with debug output
debug: build
	DEBUG=pw:mcp:* node cli.js --browser chromium --headless