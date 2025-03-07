package storage

import (
	"github.com/karansingh/pulse/pkg/models"
)

// Storage defines the interface for storing and retrieving observability data
type Storage interface {
	// Log operations
	SaveLog(log *models.LogEntry) error
	QueryLogs(query *models.QueryParams) (map[string]interface{}, error)

	// Metric operations
	SaveMetric(metric *models.Metric) error
	QueryMetrics(query *models.QueryParams) ([]map[string]interface{}, error)

	// Trace operations
	SaveSpan(span *models.Span) error
	SaveTrace(trace *models.Trace) error
	QueryTraces(query *models.QueryParams) ([]map[string]interface{}, error)
	QuerySpans(query *models.QueryParams) ([]map[string]interface{}, error)

	// Service operations
	GetServices() ([]string, error)

	// Close closes the storage connection
	Close() error
}
