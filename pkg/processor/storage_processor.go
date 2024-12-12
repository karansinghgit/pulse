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

// Close closes the processor
func (p *StorageProcessor) Close() error {
	return nil
}
