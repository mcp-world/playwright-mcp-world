#!/bin/bash

# Docker-based testing script for Playwright MCP

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to cleanup containers and images
cleanup() {
    print_status "Cleaning up Docker containers and images..."
    docker-compose down -v --remove-orphans 2>/dev/null || true
    docker rmi playwright-mcp-dev:latest 2>/dev/null || true
}

# Function to build Docker images
build_images() {
    print_status "Building Docker images..."
    
    # Build development image
    print_status "Building development image..."
    docker build -f Dockerfile.dev -t playwright-mcp-dev:latest .
    
    # Build production image  
    print_status "Building production image..."
    docker build -f Dockerfile -t playwright-mcp:latest .
}

# Function to run tests in Docker
run_docker_tests() {
    print_status "Running tests in Docker containers..."
    
    # Create test results directory
    mkdir -p test-results
    
    # Run tests using docker-compose
    if docker-compose run --rm test-runner; then
        print_status "Docker tests passed!"
        return 0
    else
        print_error "Docker tests failed!"
        return 1
    fi
}

# Function to run specific test in Docker
run_specific_test() {
    local test_file="$1"
    print_status "Running specific test: $test_file"
    
    mkdir -p test-results
    docker-compose run --rm test-runner npm test -- "$test_file"
}

# Function to start MCP server in Docker for manual testing
start_server() {
    print_status "Starting MCP server in Docker..."
    print_warning "Server will run in headless mode. Use Ctrl+C to stop."
    
    docker-compose run --rm --service-ports playwright-mcp-dev
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

Commands:
    build       Build Docker images
    test        Run all tests in Docker
    test <file> Run specific test file in Docker  
    server      Start MCP server in Docker for manual testing
    cleanup     Clean up Docker containers and images
    help        Show this help message

Examples:
    $0 build                           # Build all Docker images
    $0 test                            # Run all tests in Docker
    $0 test tests/core.spec.ts         # Run specific test file
    $0 server                          # Start server for manual testing
    $0 cleanup                         # Clean up Docker resources

EOF
}

# Main script logic
main() {
    case "${1:-help}" in
        "build")
            build_images
            ;;
        "test")
            build_images
            if [ -n "$2" ]; then
                run_specific_test "$2"
            else
                run_docker_tests
            fi
            ;;
        "server")
            build_images
            start_server
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            print_error "Unknown command: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Trap cleanup on script exit
trap cleanup EXIT

# Run main function with all arguments
main "$@"