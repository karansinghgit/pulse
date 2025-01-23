package models

import (
	"testing"
	"time"
	"unicode/utf8"
)

// FuzzNewLogEntry tests the NewLogEntry function with fuzzing
func FuzzNewLogEntry(f *testing.F) {
	// Seed corpus with some examples
	f.Add("api-service", "User logged in", string(LogLevelInfo))
	f.Add("db-service", "Query executed", string(LogLevelDebug))
	f.Add("auth-service", "Authentication failed", string(LogLevelError))

	// Fuzz test
	f.Fuzz(func(t *testing.T, service, message, level string) {
		// Skip if inputs are not valid UTF-8
		if !utf8.ValidString(service) || !utf8.ValidString(message) || !utf8.ValidString(level) {
			t.Skip("Skipping invalid UTF-8 input")
		}

		// Skip if any string is extremely long
		if len(service) > 1000 || len(message) > 10000 || len(level) > 100 {
			t.Skip("Skipping extremely long input")
		}

		// Convert level string to LogLevel
		var logLevel LogLevel
		switch level {
		case string(LogLevelDebug):
			logLevel = LogLevelDebug
		case string(LogLevelInfo):
			logLevel = LogLevelInfo
		case string(LogLevelWarning):
			logLevel = LogLevelWarning
		case string(LogLevelError):
			logLevel = LogLevelError
		case string(LogLevelFatal):
			logLevel = LogLevelFatal
		default:
			// Use a default if not a valid level
			logLevel = LogLevelInfo
		}

		// Create a log entry
		logEntry := NewLogEntry(service, message, logLevel)

		// Verify the log entry
		if logEntry.Service != service {
			t.Errorf("expected service %s, got %s", service, logEntry.Service)
		}

		if logEntry.Message != message {
			t.Errorf("expected message %s, got %s", message, logEntry.Message)
		}

		if logEntry.Level != logLevel {
			t.Errorf("expected level %s, got %s", logLevel, logEntry.Level)
		}

		// Check timestamp is recent
		now := time.Now().UTC()
		diff := now.Sub(logEntry.Timestamp)
		if diff > 5*time.Second || diff < 0 {
			t.Errorf("timestamp is not recent: %v", logEntry.Timestamp)
		}

		// Test adding tags
		tagKey := "key-" + service[:min(len(service), 5)]
		tagValue := "value-" + message[:min(len(message), 5)]

		logEntry.AddTag(tagKey, tagValue)

		if val, exists := logEntry.Tags[tagKey]; !exists || val != tagValue {
			t.Errorf("tag not properly added: expected %s=%s, got %v", tagKey, tagValue, logEntry.Tags)
		}

		// Test WithTrace
		traceID := "trace-" + service[:min(len(service), 5)]
		spanID := "span-" + message[:min(len(message), 5)]

		logEntry.WithTrace(traceID, spanID)

		if logEntry.TraceID != traceID {
			t.Errorf("expected TraceID %s, got %s", traceID, logEntry.TraceID)
		}

		if logEntry.SpanID != spanID {
			t.Errorf("expected SpanID %s, got %s", spanID, logEntry.SpanID)
		}
	})
}

// Helper function
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
