package models

import (
	"testing"
	"time"
)

func TestNewLogEntry(t *testing.T) {
	// Test cases
	testCases := []struct {
		name        string
		service     string
		message     string
		level       LogLevel
		expectLevel LogLevel
	}{
		{
			name:        "Info log entry",
			service:     "test-service",
			message:     "This is a test message",
			level:       LogLevelInfo,
			expectLevel: LogLevelInfo,
		},
		{
			name:        "Error log entry",
			service:     "error-service",
			message:     "This is an error message",
			level:       LogLevelError,
			expectLevel: LogLevelError,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			log := NewLogEntry(tc.service, tc.message, tc.level)

			if log.Service != tc.service {
				t.Errorf("expected service %s, got %s", tc.service, log.Service)
			}

			if log.Message != tc.message {
				t.Errorf("expected message %s, got %s", tc.message, log.Message)
			}

			if log.Level != tc.expectLevel {
				t.Errorf("expected level %s, got %s", tc.expectLevel, log.Level)
			}

			// Check if timestamp is recent
			now := time.Now().UTC()
			diff := now.Sub(log.Timestamp)
			if diff > 5*time.Second || diff < 0 {
				t.Errorf("timestamp is not recent: expected around %v, got %v", now, log.Timestamp)
			}
		})
	}
}

func TestLogEntry_AddTag(t *testing.T) {
	log := NewLogEntry("test-service", "This is a test message", LogLevelInfo)

	// Add a tag
	log.AddTag("key1", "value1")

	// Verify tag was added
	if val, exists := log.Tags["key1"]; !exists || val != "value1" {
		t.Errorf("expected tag with key1=value1, got %v", log.Tags)
	}

	// Test chaining
	log.AddTag("key2", "value2").AddTag("key3", "value3")

	// Verify both tags were added
	if val, exists := log.Tags["key2"]; !exists || val != "value2" {
		t.Errorf("expected tag with key2=value2, got %v", log.Tags)
	}

	if val, exists := log.Tags["key3"]; !exists || val != "value3" {
		t.Errorf("expected tag with key3=value3, got %v", log.Tags)
	}
}

func TestLogEntry_WithTrace(t *testing.T) {
	log := NewLogEntry("test-service", "This is a test message", LogLevelInfo)

	// Add trace context
	traceID := "trace-123"
	spanID := "span-456"
	log.WithTrace(traceID, spanID)

	// Verify trace context was added
	if log.TraceID != traceID {
		t.Errorf("expected TraceID %s, got %s", traceID, log.TraceID)
	}

	if log.SpanID != spanID {
		t.Errorf("expected SpanID %s, got %s", spanID, log.SpanID)
	}
}

func TestLogEntry_WithEnv(t *testing.T) {
	log := NewLogEntry("test-service", "This is a test message", LogLevelInfo)

	// Add environment
	env := "production"
	log.WithEnv(env)

	// Verify environment was added
	if log.Env != env {
		t.Errorf("expected Env %s, got %s", env, log.Env)
	}
}

func TestLogEntry_WithHost(t *testing.T) {
	log := NewLogEntry("test-service", "This is a test message", LogLevelInfo)

	// Add host
	host := "server-1"
	log.WithHost(host)

	// Verify host was added
	if log.Host != host {
		t.Errorf("expected Host %s, got %s", host, log.Host)
	}
}
