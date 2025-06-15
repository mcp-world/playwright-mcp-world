# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Primary Commands (Use Make for consistency)
- `make help` - Show all available make targets
- `make install` - Install Node.js dependencies
- `make build` - Compile TypeScript to JavaScript (outputs to `lib/` directory)
- `make test` - Run all Playwright tests across all browsers
- `make lint` - Run ESLint and TypeScript type checking (also updates README)
- `make clean` - Remove build artifacts and dependencies

### Development Workflow
- `make dev` - Start development mode with file watching
- `make serve` - Serve the MCP server locally for development
- `make debug` - Start the MCP server with debug output

### Testing Variants
- `make test-chrome` - Run tests on Chrome only
- `make test-firefox` - Run tests on Firefox only  
- `make test-webkit` - Run tests on WebKit only

### Docker Operations
- `make docker-build` - Build Docker images for testing
- `make docker-test` - Run all tests in Docker containers
- `make docker-server` - Start MCP server in Docker for manual testing
- `make docker-cleanup` - Clean up Docker containers and images
- `make docker-shell` - Start interactive shell in development container

### CI/Release
- `make ci` - Run full CI pipeline (lint, build, test)
- `make docker-ci` - Run full CI pipeline in Docker
- `make release` - Prepare for release (build, test, lint)

### Maintenance
- `make check-deps` - Check for outdated dependencies
- `make update-deps` - Update dependencies to latest versions

### Legacy npm scripts (prefer make commands)
- `npm run build`, `npm test`, `npm run lint` still work but use `make` for consistency

## Architecture Overview

This is a Model Context Protocol (MCP) server that provides browser automation capabilities using Playwright. The architecture follows a modular tool-based system:

### Core Components

**Connection Layer** (`src/connection.ts`, `src/server.ts`)
- `Connection` class manages individual MCP client connections
- `Server` class handles multiple connections and lifecycle management
- Tool routing and request handling through MCP SDK

**Browser Management** (`src/browserContextFactory.ts`, `src/context.ts`)
- `BrowserContextFactory` creates and manages browser instances
- `Context` class manages browser state, tabs, modal dialogs, and tool execution
- Supports both persistent profiles and isolated sessions

**Tool System** (`src/tools.ts`, `src/tools/`)
- Two operation modes: **Snapshot Mode** (default) uses accessibility trees, **Vision Mode** uses screenshots
- Tools organized by capability: `core`, `tabs`, `pdf`, `history`, `wait`, `files`, `install`, `testing`
- Each tool implements the `Tool` interface with schema validation and execution logic

**Configuration** (`src/config.ts`)
- Supports CLI options, configuration files, and programmatic configuration
- Handles browser launch options, network settings, capabilities, and output directories

### Tool Categories

The codebase separates tools into logical groups:
- **Navigation**: `navigate.ts` - URL navigation, back/forward
- **Interaction**: `common.ts` - clicking, typing, hovering, drag/drop  
- **Content**: `snapshot.ts`, `screenshot.ts`, `pdf.ts` - page content capture
- **Tabs**: `tabs.ts` - tab management and switching
- **Testing**: `testing.ts` - Playwright test generation
- **Utilities**: `wait.ts`, `files.ts`, `install.ts` - various helper tools

### Key Patterns

**Modal State Management**: Tools can declare they handle specific modal states (dialogs, file choosers) to ensure proper sequencing.

**Capability Filtering**: Tools are filtered based on enabled capabilities to customize the available toolset.

**Transport Abstraction**: Supports both stdio (for direct MCP integration) and HTTP/SSE (for standalone server mode).

## Testing Configuration

Tests use custom fixtures (`tests/fixtures.ts`) that can:
- Test against different browser engines (Chrome, Firefox, WebKit, Edge)
- Run in Docker containers with limited capabilities
- Switch between snapshot and vision modes
- Configure different MCP server options per test

## Entry Points

- `cli.js` - CLI entry point that loads `lib/program.js`
- `src/index.ts` - Programmatic API entry point for `createConnection()`
- `src/program.ts` - CLI argument parsing and server startup

## Development Workflow

**CRITICAL: Always use feature branches and pull requests. NEVER commit directly to main.**

### Required Workflow
1. **Create feature branch**: `git checkout -b feature/description-of-work`
2. **Implement changes** on the feature branch
3. **Build the project**: Use `make build` to ensure the code compiles without errors
4. **Commit changes** to feature branch with descriptive messages
5. **Push branch**: `git push -u origin feature/branch-name`
6. **Request manual testing**: Ask the user to manually test the changes with a running server and approve the implementation
7. **Create Pull Request**: Use `gh pr create` with proper title and description ONLY after the user confirms the implementation works correctly
8. **Only merge** after review/approval

### Important Development Practices

#### Commit Frequently
**Save progress often with commits** to enable easy rollback of changes:
- Commit working states before making major changes
- Use descriptive commit messages that explain what was changed
- This allows you to revert to a known-good state if something breaks

### Branch Naming Convention
- `feature/` - New features or enhancements
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates