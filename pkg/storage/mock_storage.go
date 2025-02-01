package storage

import (
	"errors"
	"sort"
	"strings"
	"sync"
	"time"

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

// QueryLogs implements the Storage.QueryLogs method for the mock storage
func (m *MockStorage) QueryLogs(query *models.QueryParams) ([]map[string]interface{}, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.closed {
		return nil, ErrStorageClosed
	}

	// Filter logs based on query parameters
	var filteredLogs []*models.LogEntry
	for _, log := range m.logs {
		// Apply service filter
		if query.Service != "" && log.Service != query.Service {
			continue
		}

		// Apply level filter
		if query.Level != "" && string(log.Level) != query.Level {
			continue
		}

		// Apply trace ID filter
		if query.TraceID != "" && log.TraceID != query.TraceID {
			continue
		}

		// Apply time range filters
		if !query.Since.IsZero() && log.Timestamp.Before(query.Since) {
			continue
		}
		if !query.Until.IsZero() && log.Timestamp.After(query.Until) {
			continue
		}

		// Apply search filter (simple contains check)
		if query.Search != "" {
			if !strings.Contains(log.Message, query.Search) && !strings.Contains(log.Service, query.Search) {
				continue
			}
		}

		filteredLogs = append(filteredLogs, log)
	}

	// Convert to map format
	result := make([]map[string]interface{}, 0, len(filteredLogs))
	for _, log := range filteredLogs {
		logMap := map[string]interface{}{
			"id":        log.ID,
			"timestamp": log.Timestamp.Format(time.RFC3339),
			"service":   log.Service,
			"level":     log.Level,
			"message":   log.Message,
		}

		// Add optional fields
		if log.Tags != nil && len(log.Tags) > 0 {
			logMap["tags"] = log.Tags
		}
		if log.TraceID != "" {
			logMap["trace_id"] = log.TraceID
		}
		if log.SpanID != "" {
			logMap["span_id"] = log.SpanID
		}
		if log.Env != "" {
			logMap["env"] = log.Env
		}
		if log.Host != "" {
			logMap["host"] = log.Host
		}
		if log.Source != "" {
			logMap["source"] = log.Source
		}

		result = append(result, logMap)
	}

	// Apply limit
	if query.Limit > 0 && len(result) > query.Limit {
		result = result[:query.Limit]
	}

	return result, nil
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

// QueryMetrics queries metrics from storage
func (m *MockStorage) QueryMetrics(query *models.QueryParams) ([]map[string]interface{}, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.closed {
		return nil, ErrStorageClosed
	}

	// Filter metrics based on query parameters
	var filteredMetrics []*models.Metric
	for _, metric := range m.metrics {
		// Apply service filter
		if query.Service != "" && metric.Service != query.Service {
			continue
		}

		// Apply time range filters
		if !query.Since.IsZero() && metric.Timestamp.Before(query.Since) {
			continue
		}
		if !query.Until.IsZero() && metric.Timestamp.After(query.Until) {
			continue
		}

		// Apply search filter (simple contains check)
		if query.Search != "" {
			if !strings.Contains(metric.Name, query.Search) && !strings.Contains(metric.Service, query.Search) {
				continue
			}
		}

		filteredMetrics = append(filteredMetrics, metric)
	}

	// Convert to map format
	result := make([]map[string]interface{}, 0, len(filteredMetrics))
	for _, metric := range filteredMetrics {
		metricMap := map[string]interface{}{
			"id":        metric.ID,
			"timestamp": metric.Timestamp.Format(time.RFC3339),
			"service":   metric.Service,
			"name":      metric.Name,
			"value":     metric.Value,
			"type":      metric.Type,
		}

		// Add optional fields
		if metric.Tags != nil && len(metric.Tags) > 0 {
			metricMap["tags"] = metric.Tags
		}

		result = append(result, metricMap)
	}

	// Apply limit
	if query.Limit > 0 && len(result) > query.Limit {
		result = result[:query.Limit]
	}

	return result, nil
}

// QueryTraces queries traces from storage
func (m *MockStorage) QueryTraces(query *models.QueryParams) ([]map[string]interface{}, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.closed {
		return nil, ErrStorageClosed
	}

	// Group spans by trace ID
	traceSpans := make(map[string][]*models.Span)
	rootSpans := make(map[string]*models.Span)

	// First, filter and group spans by trace ID
	for _, span := range m.spans {
		// Apply service filter
		if query.Service != "" && span.Service != query.Service {
			continue
		}

		// Apply time range filters
		if !query.Since.IsZero() && span.StartTime.Before(query.Since) {
			continue
		}
		if !query.Until.IsZero() && span.StartTime.After(query.Until) {
			continue
		}

		// Apply trace ID filter
		if query.TraceID != "" && span.TraceID != query.TraceID {
			continue
		}

		// Apply search filter
		if query.Search != "" {
			if !strings.Contains(span.Name, query.Search) && !strings.Contains(span.Service, query.Search) {
				continue
			}
		}

		// Add to trace spans
		traceSpans[span.TraceID] = append(traceSpans[span.TraceID], span)

		// If this is a root span, save it
		if span.ParentID == "" {
			rootSpans[span.TraceID] = span
		}
	}

	// Convert traces to the expected format
	result := make([]map[string]interface{}, 0, len(rootSpans))
	for traceID, rootSpan := range rootSpans {
		traceMap := map[string]interface{}{
			"id":          traceID,
			"start_time":  rootSpan.StartTime.Format(time.RFC3339),
			"service":     rootSpan.Service,
			"name":        rootSpan.Name,
			"duration_ms": rootSpan.Duration,
			"status":      rootSpan.Status,
		}

		// Add tags if present
		if rootSpan.Tags != nil && len(rootSpan.Tags) > 0 {
			traceMap["tags"] = rootSpan.Tags
		}

		result = append(result, traceMap)
	}

	// Sort by start time (newest first)
	sort.Slice(result, func(i, j int) bool {
		timeI, _ := time.Parse(time.RFC3339, result[i]["start_time"].(string))
		timeJ, _ := time.Parse(time.RFC3339, result[j]["start_time"].(string))
		return timeI.After(timeJ)
	})

	// Apply limit
	if query.Limit > 0 && len(result) > query.Limit {
		result = result[:query.Limit]
	}

	return result, nil
}

// QuerySpans queries spans from storage
func (m *MockStorage) QuerySpans(query *models.QueryParams) ([]map[string]interface{}, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.closed {
		return nil, ErrStorageClosed
	}

	// Filter spans based on query parameters
	var filteredSpans []*models.Span
	for _, span := range m.spans {
		// Apply service filter
		if query.Service != "" && span.Service != query.Service {
			continue
		}

		// Apply time range filters
		if !query.Since.IsZero() && span.StartTime.Before(query.Since) {
			continue
		}
		if !query.Until.IsZero() && span.StartTime.After(query.Until) {
			continue
		}

		// Apply trace ID filter
		if query.TraceID != "" && span.TraceID != query.TraceID {
			continue
		}

		// Apply search filter
		if query.Search != "" {
			if !strings.Contains(span.Name, query.Search) && !strings.Contains(span.Service, query.Search) {
				continue
			}
		}

		filteredSpans = append(filteredSpans, span)
	}

	// Convert to map format
	result := make([]map[string]interface{}, 0, len(filteredSpans))
	for _, span := range filteredSpans {
		spanMap := map[string]interface{}{
			"id":          span.ID,
			"trace_id":    span.TraceID,
			"start_time":  span.StartTime.Format(time.RFC3339),
			"service":     span.Service,
			"name":        span.Name,
			"duration_ms": span.Duration,
			"status":      span.Status,
		}

		// Add optional fields
		if span.ParentID != "" {
			spanMap["parent_id"] = span.ParentID
		}

		if span.Tags != nil && len(span.Tags) > 0 {
			spanMap["tags"] = span.Tags
		}

		result = append(result, spanMap)
	}

	// Sort by start time (newest first)
	sort.Slice(result, func(i, j int) bool {
		timeI, _ := time.Parse(time.RFC3339, result[i]["start_time"].(string))
		timeJ, _ := time.Parse(time.RFC3339, result[j]["start_time"].(string))
		return timeI.After(timeJ)
	})

	// Apply limit
	if query.Limit > 0 && len(result) > query.Limit {
		result = result[:query.Limit]
	}

	return result, nil
}

// GetServices returns a list of unique service names from logs, metrics, and spans
func (m *MockStorage) GetServices() ([]string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.closed {
		return nil, ErrStorageClosed
	}

	// Use a map to deduplicate service names
	serviceMap := make(map[string]bool)

	// Collect services from logs
	for _, log := range m.logs {
		if log.Service != "" {
			serviceMap[log.Service] = true
		}
	}

	// Collect services from metrics
	for _, metric := range m.metrics {
		if metric.Service != "" {
			serviceMap[metric.Service] = true
		}
	}

	// Collect services from spans
	for _, span := range m.spans {
		if span.Service != "" {
			serviceMap[span.Service] = true
		}
	}

	// Convert map keys to slice
	services := make([]string, 0, len(serviceMap))
	for service := range serviceMap {
		services = append(services, service)
	}

	// Sort services alphabetically
	sort.Strings(services)

	return services, nil
}

// Error definitions for mock storage
var (
	ErrStorageClosed = errors.New("storage is closed")
	ErrSaveFailed    = errors.New("save operation failed")
)
