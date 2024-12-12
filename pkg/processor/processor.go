package processor

import (
	"github.com/karansingh/pulse/pkg/models"
)

// Processor defines the interface for processing observability data
type Processor interface {
	// ProcessLog processes a log entry
	ProcessLog(log *models.LogEntry) error

	// ProcessMetric processes a metric
	ProcessMetric(metric *models.Metric) error

	// ProcessSpan processes a span
	ProcessSpan(span *models.Span) error

	// ProcessTrace processes a complete trace
	ProcessTrace(trace *models.Trace) error

	// Close closes any resources held by the processor
	Close() error
}

// Chain creates a processor chain from multiple processors
type Chain []Processor

// ProcessLog processes a log entry through all processors in the chain
func (c Chain) ProcessLog(log *models.LogEntry) error {
	for _, processor := range c {
		if err := processor.ProcessLog(log); err != nil {
			return err
		}
	}
	return nil
}

// ProcessMetric processes a metric through all processors in the chain
func (c Chain) ProcessMetric(metric *models.Metric) error {
	for _, processor := range c {
		if err := processor.ProcessMetric(metric); err != nil {
			return err
		}
	}
	return nil
}

// ProcessSpan processes a span through all processors in the chain
func (c Chain) ProcessSpan(span *models.Span) error {
	for _, processor := range c {
		if err := processor.ProcessSpan(span); err != nil {
			return err
		}
	}
	return nil
}

// ProcessTrace processes a trace through all processors in the chain
func (c Chain) ProcessTrace(trace *models.Trace) error {
	for _, processor := range c {
		if err := processor.ProcessTrace(trace); err != nil {
			return err
		}
	}
	return nil
}

// Close closes all processors in the chain
func (c Chain) Close() error {
	for _, processor := range c {
		if err := processor.Close(); err != nil {
			return err
		}
	}
	return nil
}
