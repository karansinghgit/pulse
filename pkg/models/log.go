package models

import (
	"time"
)

// LogLevel represents the severity of a log entry
type LogLevel string

// Define standard log levels
const (
	LogLevelDebug   LogLevel = "DEBUG"
	LogLevelInfo    LogLevel = "INFO"
	LogLevelWarning LogLevel = "WARNING"
	LogLevelError   LogLevel = "ERROR"
	LogLevelFatal   LogLevel = "FATAL"
)

// LogEntry represents a single log message with metadata
type LogEntry struct {
	ID        string            `json:"id,omitempty"`       // Unique identifier for the log entry
	Timestamp time.Time         `json:"timestamp"`          // When the log was generated
	Service   string            `json:"service"`            // Service or application name
	Level     LogLevel          `json:"level"`              // Log severity level
	Message   string            `json:"message"`            // The log message content
	Tags      map[string]string `json:"tags,omitempty"`     // Additional metadata as key-value pairs
	TraceID   string            `json:"trace_id,omitempty"` // Optional trace ID for correlation
	SpanID    string            `json:"span_id,omitempty"`  // Optional span ID within a trace
	Env       string            `json:"env,omitempty"`      // Environment (prod, dev, staging, etc.)
	Host      string            `json:"host,omitempty"`     // Hostname where the log was generated
	Source    string            `json:"source,omitempty"`   // Source of the log (file path, function name)
}

// NewLogEntry creates a new log entry with the current timestamp
func NewLogEntry(service, message string, level LogLevel) *LogEntry {
	return &LogEntry{
		Timestamp: time.Now().UTC(),
		Service:   service,
		Level:     level,
		Message:   message,
		Tags:      make(map[string]string),
	}
}

// AddTag adds a tag to the log entry
func (l *LogEntry) AddTag(key, value string) *LogEntry {
	if l.Tags == nil {
		l.Tags = make(map[string]string)
	}
	l.Tags[key] = value
	return l
}

// WithTrace adds trace context to the log entry
func (l *LogEntry) WithTrace(traceID, spanID string) *LogEntry {
	l.TraceID = traceID
	l.SpanID = spanID
	return l
}

// WithEnv sets the environment for the log entry
func (l *LogEntry) WithEnv(env string) *LogEntry {
	l.Env = env
	return l
}

// WithHost sets the hostname for the log entry
func (l *LogEntry) WithHost(host string) *LogEntry {
	l.Host = host
	return l
}
