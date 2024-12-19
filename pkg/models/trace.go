package models

import (
	"time"
)

// SpanStatus represents the status of a span
type SpanStatus string

// Define standard span statuses
const (
	SpanStatusOK       SpanStatus = "OK"
	SpanStatusError    SpanStatus = "ERROR"
	SpanStatusCanceled SpanStatus = "CANCELED"
)

// Span represents a single operation within a trace
type Span struct {
	ID         string            `json:"id"`                    // Unique identifier for this span
	TraceID    string            `json:"trace_id"`              // ID of the trace this span belongs to
	ParentID   string            `json:"parent_id,omitempty"`   // ID of the parent span, if any
	Name       string            `json:"name"`                  // Name of the operation
	Service    string            `json:"service"`               // Service that executed the operation
	StartTime  time.Time         `json:"start_time"`            // When the span started
	EndTime    time.Time         `json:"end_time,omitempty"`    // When the span ended (if completed)
	Duration   int64             `json:"duration_ms,omitempty"` // Duration in milliseconds
	Status     SpanStatus        `json:"status,omitempty"`      // Status of the operation
	Tags       map[string]string `json:"tags,omitempty"`        // Additional metadata as key-value pairs
	Logs       []SpanLog         `json:"logs,omitempty"`        // Time-stamped logs attached to this span
	Env        string            `json:"env,omitempty"`         // Environment (prod, dev, staging, etc.)
	Host       string            `json:"host,omitempty"`        // Hostname where the span was generated
	IsFinished bool              `json:"is_finished,omitempty"` // Whether the span has been completed
}

// SpanLog represents a log entry attached to a specific span
type SpanLog struct {
	Timestamp time.Time         `json:"timestamp"` // When the log was generated
	Fields    map[string]string `json:"fields"`    // Log data as key-value pairs
}

// Trace represents a collection of spans that make up an end-to-end transaction
type Trace struct {
	ID     string     `json:"id"`               // Unique identifier for the trace
	Spans  []*Span    `json:"spans"`            // Collection of spans in this trace
	Root   *Span      `json:"root"`             // Root span (entry point)
	Status SpanStatus `json:"status,omitempty"` // Overall status of the trace
}

// NewSpan creates a new span with the current timestamp as start time
func NewSpan(name string, service string, traceID string) *Span {
	return &Span{
		ID:        generateID(),
		TraceID:   traceID,
		Name:      name,
		Service:   service,
		StartTime: time.Now().UTC(),
		Tags:      make(map[string]string),
		Status:    SpanStatusOK,
	}
}

// SetParent sets the parent span ID
func (s *Span) SetParent(parentID string) *Span {
	s.ParentID = parentID
	return s
}

// Finish completes the span with the current timestamp
func (s *Span) Finish() *Span {
	s.EndTime = time.Now().UTC()
	s.Duration = s.EndTime.Sub(s.StartTime).Milliseconds()
	s.IsFinished = true
	return s
}

// SetStatus sets the status of the span
func (s *Span) SetStatus(status SpanStatus) *Span {
	s.Status = status
	return s
}

// AddTag adds a tag to the span
func (s *Span) AddTag(key, value string) *Span {
	if s.Tags == nil {
		s.Tags = make(map[string]string)
	}
	s.Tags[key] = value
	return s
}

// AddLog adds a log entry to the span
func (s *Span) AddLog(fields map[string]string) *Span {
	log := SpanLog{
		Timestamp: time.Now().UTC(),
		Fields:    fields,
	}
	s.Logs = append(s.Logs, log)
	return s
}

// WithEnv sets the environment for the span
func (s *Span) WithEnv(env string) *Span {
	s.Env = env
	return s
}

// WithHost sets the hostname for the span
func (s *Span) WithHost(host string) *Span {
	s.Host = host
	return s
}

// NewTrace creates a new trace with a root span
func NewTrace(rootSpanName string, service string) (*Trace, *Span) {
	traceID := generateID()
	rootSpan := NewSpan(rootSpanName, service, traceID)

	trace := &Trace{
		ID:     traceID,
		Spans:  []*Span{rootSpan},
		Root:   rootSpan,
		Status: SpanStatusOK,
	}

	return trace, rootSpan
}

// AddSpan adds a span to the trace
func (t *Trace) AddSpan(span *Span) *Trace {
	if span.TraceID != t.ID {
		span.TraceID = t.ID
	}
	t.Spans = append(t.Spans, span)
	return t
}

// GenerateID creates a unique ID for spans and traces
// This is a public function that can be used by external packages
func GenerateID() string {
	return generateID()
}

// generateID is a private function that generates a simple unique ID for spans and traces
func generateID() string {
	// Simple generation for demo purposes
	// In production, use a proper UUID library
	return time.Now().Format("20060102150405") + "-" + time.Now().Format("999999999")[0:6]
}
