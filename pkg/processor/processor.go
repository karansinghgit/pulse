package processor

import (
	"fmt"

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

	// QueryLogs queries logs based on parameters
	QueryLogs(query *models.QueryParams) (map[string]interface{}, error)

	// QueryMetrics queries metrics based on parameters
	QueryMetrics(query *models.QueryParams) ([]map[string]interface{}, error)

	// QueryTraces queries traces based on parameters
	QueryTraces(query *models.QueryParams) ([]map[string]interface{}, error)

	// QuerySpans queries spans based on parameters
	QuerySpans(query *models.QueryParams) ([]map[string]interface{}, error)

	// GetServices returns a list of available services
	GetServices() ([]string, error)

	// GetStats returns summary statistics
	GetStats(query *models.QueryParams) (map[string]interface{}, error)

	// Close closes any resources held by the processor
	Close() error
}

// Chain creates a processor chain from multiple processors
type Chain []Processor

// ProcessLog processes a log entry through all processors in the chain
func (c Chain) ProcessLog(log *models.LogEntry) error {
	fmt.Println("Processing log:", log)
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

// QueryLogs queries logs through the first processor in the chain
func (c Chain) QueryLogs(query *models.QueryParams) (map[string]interface{}, error) {
	if len(c) == 0 {
		return nil, fmt.Errorf("no processors in chain")
	}
	return c[0].QueryLogs(query)
}

// QueryMetrics queries metrics through the first processor in the chain
func (c Chain) QueryMetrics(query *models.QueryParams) ([]map[string]interface{}, error) {
	if len(c) == 0 {
		return nil, fmt.Errorf("no processors in chain")
	}
	return c[0].QueryMetrics(query)
}

// QueryTraces queries traces through the first processor in the chain
func (c Chain) QueryTraces(query *models.QueryParams) ([]map[string]interface{}, error) {
	if len(c) == 0 {
		return nil, fmt.Errorf("no processors in chain")
	}
	return c[0].QueryTraces(query)
}

// QuerySpans queries spans through the first processor in the chain
func (c Chain) QuerySpans(query *models.QueryParams) ([]map[string]interface{}, error) {
	if len(c) == 0 {
		return nil, fmt.Errorf("no processors in chain")
	}
	return c[0].QuerySpans(query)
}

// GetServices returns available services through the first processor in the chain
func (c Chain) GetServices() ([]string, error) {
	if len(c) == 0 {
		return nil, fmt.Errorf("no processors in chain")
	}
	return c[0].GetServices()
}

// GetStats returns statistics through the first processor in the chain
func (c Chain) GetStats(query *models.QueryParams) (map[string]interface{}, error) {
	if len(c) == 0 {
		return nil, fmt.Errorf("no processors in chain")
	}
	return c[0].GetStats(query)
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
