package storage

import (
	"testing"
	"time"

	"github.com/karansingh/pulse/pkg/models"
)

func TestMockStorage_SaveLog(t *testing.T) {
	// Create a mock storage
	storage := NewMockStorage()

	// Create a log entry
	log := &models.LogEntry{
		ID:        "log-123",
		Timestamp: time.Now().UTC(),
		Service:   "test-service",
		Level:     models.LogLevelInfo,
		Message:   "Test message",
		Tags:      map[string]string{"key": "value"},
	}

	// Save the log
	err := storage.SaveLog(log)
	if err != nil {
		t.Errorf("expected no error, got: %v", err)
	}

	// Verify the log was saved
	logs := storage.GetLogs()
	if len(logs) != 1 {
		t.Errorf("expected 1 log, got %d", len(logs))
	}

	if logs[0].ID != log.ID {
		t.Errorf("expected log ID %s, got %s", log.ID, logs[0].ID)
	}

	// Set error on save
	storage.SetErrorOnSave(true)

	// Try to save again
	err = storage.SaveLog(log)
	if err == nil {
		t.Errorf("expected error when save is configured to fail")
	}

	if err != ErrSaveFailed {
		t.Errorf("expected ErrSaveFailed, got: %v", err)
	}
}

func TestMockStorage_SaveMetric(t *testing.T) {
	// Create a mock storage
	storage := NewMockStorage()

	// Create a metric
	metric := &models.Metric{
		ID:        "metric-123",
		Name:      "test_metric",
		Value:     42,
		Timestamp: time.Now().UTC(),
		Type:      models.MetricTypeCounter,
		Service:   "test-service",
		Tags:      map[string]string{"key": "value"},
	}

	// Save the metric
	err := storage.SaveMetric(metric)
	if err != nil {
		t.Errorf("expected no error, got: %v", err)
	}

	// Verify the metric was saved
	metrics := storage.GetMetrics()
	if len(metrics) != 1 {
		t.Errorf("expected 1 metric, got %d", len(metrics))
	}

	if metrics[0].ID != metric.ID {
		t.Errorf("expected metric ID %s, got %s", metric.ID, metrics[0].ID)
	}
}

func TestMockStorage_SaveSpan(t *testing.T) {
	// Create a mock storage
	storage := NewMockStorage()

	// Create a span
	span := &models.Span{
		ID:        "span-123",
		TraceID:   "trace-123",
		Name:      "test_span",
		Service:   "test-service",
		StartTime: time.Now().UTC(),
		Status:    models.SpanStatusOK,
		Tags:      map[string]string{"key": "value"},
	}

	// Save the span
	err := storage.SaveSpan(span)
	if err != nil {
		t.Errorf("expected no error, got: %v", err)
	}

	// Verify the span was saved
	spans := storage.GetSpans()
	if len(spans) != 1 {
		t.Errorf("expected 1 span, got %d", len(spans))
	}

	if spans[0].ID != span.ID {
		t.Errorf("expected span ID %s, got %s", span.ID, spans[0].ID)
	}
}

func TestMockStorage_SaveTrace(t *testing.T) {
	// Create a mock storage
	storage := NewMockStorage()

	// Create a trace with spans
	rootSpan := &models.Span{
		ID:        "span-root",
		TraceID:   "trace-123",
		Name:      "root_span",
		Service:   "test-service",
		StartTime: time.Now().UTC(),
		Status:    models.SpanStatusOK,
	}

	childSpan := &models.Span{
		ID:        "span-child",
		TraceID:   "trace-123",
		ParentID:  rootSpan.ID,
		Name:      "child_span",
		Service:   "test-service",
		StartTime: time.Now().UTC(),
		Status:    models.SpanStatusOK,
	}

	trace := &models.Trace{
		ID:     "trace-123",
		Spans:  []*models.Span{rootSpan, childSpan},
		Root:   rootSpan,
		Status: models.SpanStatusOK,
	}

	// Save the trace
	err := storage.SaveTrace(trace)
	if err != nil {
		t.Errorf("expected no error, got: %v", err)
	}

	// Verify the trace was saved
	traces := storage.GetTraces()
	if len(traces) != 1 {
		t.Errorf("expected 1 trace, got %d", len(traces))
	}

	if traces[0].ID != trace.ID {
		t.Errorf("expected trace ID %s, got %s", trace.ID, traces[0].ID)
	}

	// Verify spans were also saved
	spans := storage.GetSpans()
	if len(spans) != 2 {
		t.Errorf("expected 2 spans, got %d", len(spans))
	}

	// Verify the root span
	foundRoot := false
	foundChild := false
	for _, s := range spans {
		if s.ID == rootSpan.ID {
			foundRoot = true
		}
		if s.ID == childSpan.ID {
			foundChild = true
		}
	}

	if !foundRoot {
		t.Errorf("expected to find root span")
	}

	if !foundChild {
		t.Errorf("expected to find child span")
	}
}

func TestMockStorage_Close(t *testing.T) {
	// Create a mock storage
	storage := NewMockStorage()

	// Close the storage
	err := storage.Close()
	if err != nil {
		t.Errorf("expected no error, got: %v", err)
	}

	// Verify storage is closed
	log := &models.LogEntry{
		Service: "test-service",
		Level:   models.LogLevelInfo,
		Message: "Test message",
	}

	err = storage.SaveLog(log)
	if err == nil {
		t.Errorf("expected error when storage is closed")
	}

	if err != ErrStorageClosed {
		t.Errorf("expected ErrStorageClosed, got: %v", err)
	}
}
