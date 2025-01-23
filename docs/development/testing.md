# Testing Guide

This guide explains how to run and create tests for the Pulse project.

## Running Tests

Pulse includes several types of tests: unit tests, integration tests, benchmark tests, and fuzz tests.

### Unit Tests

To run all unit tests:

```bash
go test ./...
```

To run tests in a specific package:

```bash
go test ./pkg/models
go test ./pkg/storage
go test ./pkg/api
```

### Integration Tests

Integration tests verify that different components work together correctly:

```bash
go test ./... -tags=integration
```

### Benchmark Tests

Benchmark tests measure the performance of critical operations:

```bash
go test ./pkg/storage -bench=. -benchtime=5s
```

### Fuzz Tests

Fuzz tests generate random inputs to help find edge cases and security issues:

```bash
go test ./pkg/models -fuzz=FuzzNewLogEntry -fuzztime=1m
```

## Test Coverage

To check test coverage:

```bash
go test ./... -cover
```

For a detailed coverage report:

```bash
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

## Writing Tests

### Unit Tests

Unit tests should be placed in the same package as the code they test, with filenames ending in `_test.go`.

Example:

```go
// pkg/models/log_test.go
package models

import (
    "testing"
)

func TestNewLogEntry(t *testing.T) {
    log := NewLogEntry("test-service", "message", LogLevelInfo)
    
    if log.Service != "test-service" {
        t.Errorf("expected service %s, got %s", "test-service", log.Service)
    }
}
```

### Table-Driven Tests

For testing multiple scenarios, use table-driven tests:

```go
func TestSomeFunction(t *testing.T) {
    tests := []struct {
        name     string
        input    string
        expected string
    }{
        {"case1", "input1", "expected1"},
        {"case2", "input2", "expected2"},
    }
    
    for _, tc := range tests {
        t.Run(tc.name, func(t *testing.T) {
            got := SomeFunction(tc.input)
            if got != tc.expected {
                t.Errorf("expected %s, got %s", tc.expected, got)
            }
        })
    }
}
```

### Mock Objects

For testing components that depend on external services or databases, use mock objects:

```go
// Use the MockStorage implementation for testing
storage := storage.NewMockStorage()
processor := processor.NewProcessor(storage)

// Test with the mock
err := processor.Process(data)
if err != nil {
    t.Errorf("processing failed: %v", err)
}

// Verify interaction with storage
logs := storage.GetLogs()
if len(logs) != 1 {
    t.Errorf("expected 1 log, got %d", len(logs))
}
```

### Benchmark Tests

Write benchmark tests for performance-critical code:

```go
func BenchmarkSaveLog(b *testing.B) {
    storage := NewMockStorage()
    log := NewLogEntry("benchmark", "message", LogLevelInfo)
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        storage.SaveLog(log)
    }
}
```

### Fuzz Tests

Fuzz tests help find bugs by generating random inputs:

```go
func FuzzParseInput(f *testing.F) {
    // Seed corpus with examples
    f.Add("example1")
    f.Add("example2")
    
    f.Fuzz(func(t *testing.T, input string) {
        result, err := ParseInput(input)
        if err != nil {
            // Only report an error if it's not expected
            if !isExpectedError(err) {
                t.Errorf("unexpected error: %v", err)
            }
        } else {
            // Check that the result is valid
            if !isValidResult(result) {
                t.Errorf("invalid result: %v", result)
            }
        }
    })
}
```

## Continuous Integration

Our CI pipeline runs all tests on each pull request. Before submitting, please:

1. Run `go test ./...` to ensure all tests pass
2. Run `go vet ./...` to check for potential issues
3. Run `golint ./...` to ensure code follows style guidelines

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it
2. **One Assertion Per Test**: Keep tests focused on a single behavior
3. **Fast Tests**: Unit tests should be quick to run
4. **Independent Tests**: Tests should not depend on each other
5. **Readable Tests**: Tests serve as documentation, so make them clear and easy to understand 