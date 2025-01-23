package models

import (
	"testing"
	"time"
)

func TestNewSpan(t *testing.T) {
	// Test cases
	testCases := []struct {
		name     string
		spanName string
		service  string
		status   SpanStatus
	}{
		{
			name:     "Simple span",
			spanName: "http_request",
			service:  "api-gateway",
			status:   SpanStatusOK,
		},
		{
			name:     "Error span",
			spanName: "database_query",
			service:  "db-service",
			status:   SpanStatusError,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			traceID := "test-trace-123"
			span := NewSpan(tc.spanName, tc.service, traceID)

			if span.Name != tc.spanName {
				t.Errorf("expected name %s, got %s", tc.spanName, span.Name)
			}

			if span.Service != tc.service {
				t.Errorf("expected service %s, got %s", tc.service, span.Service)
			}

			if span.TraceID != traceID {
				t.Errorf("expected traceID %s, got %s", traceID, span.TraceID)
			}

			// Status should be OK initially
			if span.Status != SpanStatusOK {
				t.Errorf("expected status %s, got %s", SpanStatusOK, span.Status)
			}

			// Set status and check it
			span.SetStatus(tc.status)
			if span.Status != tc.status {
				t.Errorf("expected status %s, got %s", tc.status, span.Status)
			}

			// Check if start time is recent
			now := time.Now().UTC()
			diff := now.Sub(span.StartTime)
			if diff > 5*time.Second || diff < 0 {
				t.Errorf("timestamp is not recent: expected around %v, got %v", now, span.StartTime)
			}
		})
	}
}

func TestSpan_AddTag(t *testing.T) {
	traceID := "test-trace-123"
	span := NewSpan("test_span", "test-service", traceID)

	// Add a tag
	span.AddTag("key1", "value1")

	// Verify tag was added
	if val, exists := span.Tags["key1"]; !exists || val != "value1" {
		t.Errorf("expected tag with key1=value1, got %v", span.Tags)
	}

	// Test chaining
	span.AddTag("key2", "value2").AddTag("key3", "value3")

	// Verify both tags were added
	if val, exists := span.Tags["key2"]; !exists || val != "value2" {
		t.Errorf("expected tag with key2=value2, got %v", span.Tags)
	}

	if val, exists := span.Tags["key3"]; !exists || val != "value3" {
		t.Errorf("expected tag with key3=value3, got %v", span.Tags)
	}
}

func TestSpan_Finish(t *testing.T) {
	traceID := "test-trace-123"
	span := NewSpan("test_span", "test-service", traceID)

	// Sleep a bit to ensure duration is measurable
	time.Sleep(50 * time.Millisecond)

	// Finish the span
	span.Finish()

	// Duration should be positive
	if span.Duration <= 0 {
		t.Errorf("expected positive duration, got %d", span.Duration)
	}

	// Duration should be reasonable (between 10ms and 1000ms)
	if span.Duration < 10 || span.Duration > 1000 {
		t.Errorf("expected duration between 10ms and 1000ms, got %d", span.Duration)
	}

	// IsFinished should be true
	if !span.IsFinished {
		t.Errorf("expected IsFinished to be true")
	}

	// EndTime should be set
	if span.EndTime.IsZero() {
		t.Errorf("expected EndTime to be set")
	}
}

func TestNewTrace(t *testing.T) {
	// Create a new trace with a root span
	rootSpanName := "root_span"
	service := "test-service"
	trace, rootSpan := NewTrace(rootSpanName, service)

	// Check trace ID matches root span's trace ID
	if trace.ID != rootSpan.TraceID {
		t.Errorf("expected trace ID %s, got %s", rootSpan.TraceID, trace.ID)
	}

	// Check spans array contains root span
	if len(trace.Spans) != 1 {
		t.Errorf("expected 1 span in trace, got %d", len(trace.Spans))
	}

	if trace.Spans[0].ID != rootSpan.ID {
		t.Errorf("expected root span ID %s, got %s", rootSpan.ID, trace.Spans[0].ID)
	}

	// Check root span properties
	if rootSpan.Name != rootSpanName {
		t.Errorf("expected span name %s, got %s", rootSpanName, rootSpan.Name)
	}

	if rootSpan.Service != service {
		t.Errorf("expected service %s, got %s", service, rootSpan.Service)
	}
}

func TestTrace_AddSpan(t *testing.T) {
	// Create a trace with a root span
	trace, rootSpan := NewTrace("root_span", "test-service")

	// Create and add a child span
	childSpan := NewSpan("child_span", "test-service", trace.ID)
	childSpan.SetParent(rootSpan.ID)

	trace.AddSpan(childSpan)

	// Check that the child span was added
	if len(trace.Spans) != 2 {
		t.Errorf("expected 2 spans in trace, got %d", len(trace.Spans))
	}

	// Verify child relationship
	foundChild := false
	for _, span := range trace.Spans {
		if span.ID == childSpan.ID {
			foundChild = true
			if span.ParentID != rootSpan.ID {
				t.Errorf("expected parent ID %s, got %s", rootSpan.ID, span.ParentID)
			}
		}
	}

	if !foundChild {
		t.Errorf("child span not found in trace spans")
	}
}
