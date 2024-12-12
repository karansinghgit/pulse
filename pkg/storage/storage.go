package storage

import (
	"github.com/karansingh/pulse/pkg/models"
)

// Storage defines the interface for storing and retrieving observability data
type Storage interface {
	// Log operations
	SaveLog(log *models.LogEntry) error

	// Metric operations
	SaveMetric(metric *models.Metric) error

	// Trace operations
	SaveSpan(span *models.Span) error
	SaveTrace(trace *models.Trace) error

	// Close closes the storage connection
	Close() error
}
