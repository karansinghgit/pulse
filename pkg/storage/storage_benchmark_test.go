package storage

import (
	"testing"
	"time"

	"github.com/karansingh/pulse/pkg/models"
)

func BenchmarkMockStorage_SaveLog(b *testing.B) {
	storage := NewMockStorage()

	log := &models.LogEntry{
		ID:        "log-123",
		Timestamp: time.Now().UTC(),
		Service:   "benchmark-service",
		Level:     models.LogLevelInfo,
		Message:   "Benchmark log message",
		Tags:      map[string]string{"env": "benchmark", "region": "us-west"},
	}

	// Reset timer before the actual benchmark
	b.ResetTimer()

	// Run benchmark
	for i := 0; i < b.N; i++ {
		err := storage.SaveLog(log)
		if err != nil {
			b.Fatalf("error during benchmark: %v", err)
		}
	}
}

func BenchmarkMockStorage_SaveMetric(b *testing.B) {
	storage := NewMockStorage()

	metric := &models.Metric{
		ID:        "metric-123",
		Name:      "benchmark_metric",
		Value:     42.5,
		Timestamp: time.Now().UTC(),
		Type:      models.MetricTypeGauge,
		Service:   "benchmark-service",
		Tags:      map[string]string{"env": "benchmark", "region": "us-west"},
	}

	// Reset timer before the actual benchmark
	b.ResetTimer()

	// Run benchmark
	for i := 0; i < b.N; i++ {
		err := storage.SaveMetric(metric)
		if err != nil {
			b.Fatalf("error during benchmark: %v", err)
		}
	}
}

func BenchmarkMockStorage_SaveSpan(b *testing.B) {
	storage := NewMockStorage()

	span := &models.Span{
		ID:        "span-123",
		TraceID:   "trace-123",
		Name:      "benchmark_span",
		Service:   "benchmark-service",
		StartTime: time.Now().UTC(),
		EndTime:   time.Now().UTC().Add(100 * time.Millisecond),
		Duration:  100,
		Status:    models.SpanStatusOK,
		Tags:      map[string]string{"env": "benchmark", "region": "us-west"},
	}

	// Reset timer before the actual benchmark
	b.ResetTimer()

	// Run benchmark
	for i := 0; i < b.N; i++ {
		err := storage.SaveSpan(span)
		if err != nil {
			b.Fatalf("error during benchmark: %v", err)
		}
	}
}

func BenchmarkMockStorage_SaveTrace(b *testing.B) {
	storage := NewMockStorage()

	rootSpan := &models.Span{
		ID:        "span-root",
		TraceID:   "trace-123",
		Name:      "benchmark_root_span",
		Service:   "benchmark-service",
		StartTime: time.Now().UTC(),
		EndTime:   time.Now().UTC().Add(200 * time.Millisecond),
		Duration:  200,
		Status:    models.SpanStatusOK,
		Tags:      map[string]string{"env": "benchmark"},
	}

	childSpan := &models.Span{
		ID:        "span-child",
		TraceID:   "trace-123",
		ParentID:  rootSpan.ID,
		Name:      "benchmark_child_span",
		Service:   "benchmark-service",
		StartTime: time.Now().UTC().Add(50 * time.Millisecond),
		EndTime:   time.Now().UTC().Add(150 * time.Millisecond),
		Duration:  100,
		Status:    models.SpanStatusOK,
		Tags:      map[string]string{"env": "benchmark"},
	}

	trace := &models.Trace{
		ID:     "trace-123",
		Spans:  []*models.Span{rootSpan, childSpan},
		Root:   rootSpan,
		Status: models.SpanStatusOK,
	}

	// Reset timer before the actual benchmark
	b.ResetTimer()

	// Run benchmark
	for i := 0; i < b.N; i++ {
		err := storage.SaveTrace(trace)
		if err != nil {
			b.Fatalf("error during benchmark: %v", err)
		}

		// Clear storage after each iteration to avoid memory buildup
		if i%1000 == 0 {
			b.StopTimer()
			storage.ClearAll()
			b.StartTimer()
		}
	}
}

// BenchmarkConcurrentStorage tests concurrent access to storage
func BenchmarkConcurrentStorage(b *testing.B) {
	storage := NewMockStorage()

	// Create test data
	log := &models.LogEntry{
		ID:        "log-123",
		Timestamp: time.Now().UTC(),
		Service:   "benchmark-service",
		Level:     models.LogLevelInfo,
		Message:   "Benchmark log message",
	}

	metric := &models.Metric{
		ID:        "metric-123",
		Name:      "benchmark_metric",
		Value:     42.5,
		Timestamp: time.Now().UTC(),
		Type:      models.MetricTypeGauge,
		Service:   "benchmark-service",
	}

	span := &models.Span{
		ID:        "span-123",
		TraceID:   "trace-123",
		Name:      "benchmark_span",
		Service:   "benchmark-service",
		StartTime: time.Now().UTC(),
		Status:    models.SpanStatusOK,
	}

	// Reset timer before the actual benchmark
	b.ResetTimer()

	// Run benchmark with goroutines
	b.RunParallel(func(pb *testing.PB) {
		counter := 0
		for pb.Next() {
			// Alternately save different types of data
			switch counter % 3 {
			case 0:
				err := storage.SaveLog(log)
				if err != nil {
					b.Fatalf("error during log benchmark: %v", err)
				}
			case 1:
				err := storage.SaveMetric(metric)
				if err != nil {
					b.Fatalf("error during metric benchmark: %v", err)
				}
			case 2:
				err := storage.SaveSpan(span)
				if err != nil {
					b.Fatalf("error during span benchmark: %v", err)
				}
			}
			counter++
		}
	})
}
