#!/bin/bash
# Script to run all tests for the Pulse project

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Running Pulse Test Suite${NC}"
echo "=================================="

# Run go vet first to catch any issues
echo -e "\n${YELLOW}Running go vet...${NC}"
go vet ./...
echo -e "${GREEN}✓ go vet passed${NC}"

# Run unit tests
echo -e "\n${YELLOW}Running unit tests...${NC}"
go test -v ./...
echo -e "${GREEN}✓ Unit tests passed${NC}"

# Run tests with race detection
echo -e "\n${YELLOW}Running tests with race detection...${NC}"
go test -race ./...
echo -e "${GREEN}✓ Race detection tests passed${NC}"

# Run benchmark tests
echo -e "\n${YELLOW}Running benchmark tests...${NC}"
go test -bench=. -benchmem ./pkg/storage
echo -e "${GREEN}✓ Benchmark tests completed${NC}"

# Run fuzz tests (limited time for CI)
echo -e "\n${YELLOW}Running fuzz tests (10 seconds)...${NC}"
go test -fuzz=FuzzNewLogEntry -fuzztime=10s ./pkg/models
echo -e "${GREEN}✓ Fuzz tests completed${NC}"

# Generate and display test coverage
echo -e "\n${YELLOW}Generating test coverage report...${NC}"
go test -coverprofile=coverage.out ./...
go tool cover -func=coverage.out
echo -e "${GREEN}✓ Coverage report generated${NC}"

# Optional: Generate HTML coverage report
echo -e "\n${YELLOW}Generating HTML coverage report...${NC}"
go tool cover -html=coverage.out -o coverage.html
echo -e "${GREEN}✓ HTML coverage report generated at coverage.html${NC}"

echo -e "\n${GREEN}All tests completed successfully!${NC}" 