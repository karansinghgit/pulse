package processor

import (
	"github.com/karansingh/pulse/pkg/models"
	"github.com/karansingh/pulse/pkg/storage"
)

// StorageProcessor is a processor that persists data to storage
type StorageProcessor struct {
	storage storage.Storage
}

// NewStorageProcessor creates a new storage processor
func NewStorageProcessor(storage storage.Storage) *StorageProcessor {
	return &StorageProcessor{
		storage: storage,
	}
}

// ProcessLog persists a log entry to storage
func (p *StorageProcessor) ProcessLog(log *models.LogEntry) error {
	return p.storage.SaveLog(log)
}

// ProcessMetric persists a metric to storage
func (p *StorageProcessor) ProcessMetric(metric *models.Metric) error {
	return p.storage.SaveMetric(metric)
}

// ProcessSpan persists a span to storage
func (p *StorageProcessor) ProcessSpan(span *models.Span) error {
	return p.storage.SaveSpan(span)
}

// ProcessTrace persists a trace to storage
func (p *StorageProcessor) ProcessTrace(trace *models.Trace) error {
	return p.storage.SaveTrace(trace)
}

// QueryLogs queries logs from storage
func (p *StorageProcessor) QueryLogs(query *models.QueryParams) ([]map[string]interface{}, error) {
	// Delegate to the storage implementation
	return p.storage.QueryLogs(query)
}

// QueryMetrics queries metrics from storage
func (p *StorageProcessor) QueryMetrics(query *models.QueryParams) ([]map[string]interface{}, error) {
	// Delegate to the storage implementation
	return p.storage.QueryMetrics(query)
}

// QueryTraces queries traces from storage
func (p *StorageProcessor) QueryTraces(query *models.QueryParams) ([]map[string]interface{}, error) {
	// Delegate to the storage implementation
	return p.storage.QueryTraces(query)
}

// QuerySpans queries spans from storage
func (p *StorageProcessor) QuerySpans(query *models.QueryParams) ([]map[string]interface{}, error) {
	// Delegate to the storage implementation
	return p.storage.QuerySpans(query)
}

// GetServices returns a list of available services
func (p *StorageProcessor) GetServices() ([]string, error) {
	// Delegate to the storage implementation
	return p.storage.GetServices()
}

// GetStats returns summary statistics
func (p *StorageProcessor) GetStats(query *models.QueryParams) (map[string]interface{}, error) {
	// For now, return a placeholder implementation
	return map[string]interface{}{
		"logs": map[string]interface{}{
			"total": 1245,
			"by_level": map[string]int{
				"INFO":    987,
				"WARNING": 142,
				"ERROR":   116,
			},
		},
		"metrics": map[string]interface{}{
			"total": 5432,
			"by_type": map[string]int{
				"counter":   1234,
				"gauge":     3456,
				"histogram": 742,
			},
		},
		"traces": map[string]interface{}{
			"total":           876,
			"avg_duration_ms": 123.45,
		},
	}, nil
}

// Close closes the processor
func (p *StorageProcessor) Close() error {
	return p.storage.Close()
}
