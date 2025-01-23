# Data Models

This document describes the core data models used in Pulse for representing logs, metrics, and traces.

## Overview

Pulse uses a unified data model approach where all observability data types share common attributes while maintaining their specific characteristics. This allows for consistent handling, storage, and querying across different types of telemetry data.

## Common Attributes

All data models share these common attributes:

| Attribute | Type | Description |
|-----------|------|-------------|
| ID | string | Unique identifier for the entry |
| Timestamp | time.Time | When the data was generated |
| Service | string | Service or application name |
| Tags | map[string]string | Key-value pairs for additional metadata |
| TraceID | string | Optional trace ID for correlation |
| Env | string | Environment (prod, dev, staging, etc.) |
| Host | string | Hostname where the data was generated |

## Log Model

Logs represent discrete events that occurred in a system.

### LogEntry

```go
type LogEntry struct {
    ID        string            // Unique identifier
    Timestamp time.Time         // When the log was generated
    Service   string            // Service or application name
    Level     LogLevel          // Log severity level
    Message   string            // The log message content
    Tags      map[string]string // Additional metadata
    TraceID   string            // Optional trace ID for correlation
    SpanID    string            // Optional span ID within a trace
    Env       string            // Environment (prod, dev, staging, etc.)
    Host      string            // Hostname where the log was generated
    Source    string            // Source of the log (file path, function name)
}
```

### Log Levels

```go
type LogLevel string

const (
    LogLevelDebug   LogLevel = "DEBUG"
    LogLevelInfo    LogLevel = "INFO"
    LogLevelWarning LogLevel = "WARNING"
    LogLevelError   LogLevel = "ERROR"
    LogLevelFatal   LogLevel = "FATAL"
)
```

## Metric Model

Metrics represent measurements of a value at a point in time.

### Metric

```go
type Metric struct {
    ID        string            // Unique identifier
    Name      string            // Metric name (e.g., "http.requests")
    Value     float64           // The measured value
    Timestamp time.Time         // When the metric was recorded
    Type      MetricType        // Type of metric (counter, gauge, etc.)
    Service   string            // Service or application name
    Tags      map[string]string // Dimensions for the metric
    TraceID   string            // Optional trace ID for correlation
    Env       string            // Environment (prod, dev, staging, etc.)
    Host      string            // Hostname where the metric was generated
}
```

### Metric Types

```go
type MetricType string

const (
    MetricTypeCounter   MetricType = "counter"   // Monotonically increasing counter
    MetricTypeGauge     MetricType = "gauge"     // Value that can go up and down
    MetricTypeHistogram MetricType = "histogram" // Distribution of values
    MetricTypeSummary   MetricType = "summary"   // Similar to histogram but with calculated quantiles
)
```

### Histogram Metric

```go
type HistogramMetric struct {
    Metric
    Buckets    []HistogramBucket   // Histogram buckets
    Sum        float64             // Sum of all observed values
    Count      uint64              // Count of observations
    Percentile map[float64]float64 // Optional pre-calculated percentiles
}

type HistogramBucket struct {
    UpperBound float64 // Upper bound of the bucket
    Count      uint64  // Number of observations in this bucket
}
```

## Trace Model

Traces represent the path of a request through a distributed system.

### Span

```go
type Span struct {
    ID         string            // Unique identifier for this span
    TraceID    string            // ID of the trace this span belongs to
    ParentID   string            // ID of the parent span, if any
    Name       string            // Name of the operation
    Service    string            // Service that executed the operation
    StartTime  time.Time         // When the span started
    EndTime    time.Time         // When the span ended (if completed)
    Duration   int64             // Duration in milliseconds
    Status     SpanStatus        // Status of the operation
    Tags       map[string]string // Additional metadata
    Logs       []SpanLog         // Time-stamped logs attached to this span
    Env        string            // Environment (prod, dev, staging, etc.)
    Host       string            // Hostname where the span was generated
    IsFinished bool              // Whether the span has been completed
}
```

### Span Status

```go
type SpanStatus string

const (
    SpanStatusOK       SpanStatus = "OK"
    SpanStatusError    SpanStatus = "ERROR"
    SpanStatusCanceled SpanStatus = "CANCELED"
)
```

### Span Log

```go
type SpanLog struct {
    Timestamp time.Time         // When the log was generated
    Fields    map[string]string // Log data as key-value pairs
}
```

### Trace

```go
type Trace struct {
    ID     string     // Unique identifier for the trace
    Spans  []*Span    // Collection of spans in this trace
    Root   *Span      // Root span (entry point)
    Status SpanStatus // Overall status of the trace
}
```

## Query Model

The query model allows for consistent filtering across all data types:

```go
type Query struct {
    Service   string            // Filter by service name
    StartTime time.Time         // Filter by start time
    EndTime   time.Time         // Filter by end time
    Tags      map[string]string // Filter by tags
    Limit     int               // Limit number of results
    Offset    int               // Offset for pagination
}
```

## Best Practices

1. **Always include a service name**: This helps identify the source of the data
2. **Use consistent tag names**: Standardize tag names across your organization
3. **Include trace context when possible**: This enables correlation between logs, metrics, and traces
4. **Set appropriate log levels**: Use INFO for normal operations, ERROR for issues requiring attention
5. **Use descriptive metric names**: Follow a naming convention like `<domain>.<operation>.<unit>` 