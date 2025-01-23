package storage

import (
	"errors"
	"sync"

	"github.com/karansingh/pulse/pkg/models"
)

// MockStorage implements the Storage interface for testing purposes
type MockStorage struct {
	mu          sync.RWMutex
	logs        []*models.LogEntry
	metrics     []*models.Metric
	histograms  []*models.HistogramMetric
	spans       []*models.Span
	traces      []*models.Trace
	closed      bool
	errorOnSave bool
}

// NewMockStorage creates a new mock storage instance
func NewMockStorage() *MockStorage {
	return &MockStorage{
		logs:       make([]*models.LogEntry, 0),
		metrics:    make([]*models.Metric, 0),
		histograms: make([]*models.HistogramMetric, 0),
		spans:      make([]*models.Span, 0),
		traces:     make([]*models.Trace, 0),
		closed:     false,
	}
}

// SetErrorOnSave configures the mock to return an error on save operations
func (m *MockStorage) SetErrorOnSave(shouldError bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.errorOnSave = shouldError
}

// SaveLog implements Storage.SaveLog
func (m *MockStorage) SaveLog(log *models.LogEntry) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.closed {
		return ErrStorageClosed
	}

	if m.errorOnSave {
		return ErrSaveFailed
	}

	m.logs = append(m.logs, log)
	return nil
}

// SaveMetric implements Storage.SaveMetric
func (m *MockStorage) SaveMetric(metric *models.Metric) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.closed {
		return ErrStorageClosed
	}

	if m.errorOnSave {
		return ErrSaveFailed
	}

	// Add the regular metric
	m.metrics = append(m.metrics, metric)
	return nil
}

// SaveHistogramMetric saves a histogram metric
func (m *MockStorage) SaveHistogramMetric(histogram *models.HistogramMetric) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.closed {
		return ErrStorageClosed
	}

	if m.errorOnSave {
		return ErrSaveFailed
	}

	m.histograms = append(m.histograms, histogram)
	return nil
}

// SaveSpan implements Storage.SaveSpan
func (m *MockStorage) SaveSpan(span *models.Span) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.closed {
		return ErrStorageClosed
	}

	if m.errorOnSave {
		return ErrSaveFailed
	}

	m.spans = append(m.spans, span)
	return nil
}

// SaveTrace implements Storage.SaveTrace
func (m *MockStorage) SaveTrace(trace *models.Trace) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.closed {
		return ErrStorageClosed
	}

	if m.errorOnSave {
		return ErrSaveFailed
	}

	m.traces = append(m.traces, trace)

	// Also save all spans in the trace
	for _, span := range trace.Spans {
		m.spans = append(m.spans, span)
	}

	return nil
}

// Close implements Storage.Close
func (m *MockStorage) Close() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.closed = true
	return nil
}

// GetLogs returns all saved logs
func (m *MockStorage) GetLogs() []*models.LogEntry {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]*models.LogEntry, len(m.logs))
	copy(result, m.logs)
	return result
}

// GetMetrics returns all saved metrics
func (m *MockStorage) GetMetrics() []*models.Metric {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]*models.Metric, len(m.metrics))
	copy(result, m.metrics)
	return result
}

// GetHistograms returns all saved histogram metrics
func (m *MockStorage) GetHistograms() []*models.HistogramMetric {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]*models.HistogramMetric, len(m.histograms))
	copy(result, m.histograms)
	return result
}

// GetSpans returns all saved spans
func (m *MockStorage) GetSpans() []*models.Span {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]*models.Span, len(m.spans))
	copy(result, m.spans)
	return result
}

// GetTraces returns all saved traces
func (m *MockStorage) GetTraces() []*models.Trace {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]*models.Trace, len(m.traces))
	copy(result, m.traces)
	return result
}

// ClearAll clears all stored data
func (m *MockStorage) ClearAll() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.logs = make([]*models.LogEntry, 0)
	m.metrics = make([]*models.Metric, 0)
	m.histograms = make([]*models.HistogramMetric, 0)
	m.spans = make([]*models.Span, 0)
	m.traces = make([]*models.Trace, 0)
}

// Error definitions for mock storage
var (
	ErrStorageClosed = errors.New("storage is closed")
	ErrSaveFailed    = errors.New("save operation failed")
)
