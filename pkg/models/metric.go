package models

import (
	"time"
)

// MetricType represents the type of metric being captured
type MetricType string

// Define standard metric types
const (
	MetricTypeCounter   MetricType = "counter"   // Monotonically increasing counter
	MetricTypeGauge     MetricType = "gauge"     // Value that can go up and down
	MetricTypeHistogram MetricType = "histogram" // Distribution of values
	MetricTypeSummary   MetricType = "summary"   // Similar to histogram but with calculated quantiles
)

// Metric represents a single measurement with metadata
type Metric struct {
	ID        string            `json:"id,omitempty"`       // Unique identifier for the metric
	Name      string            `json:"name"`               // Metric name (e.g., "http.requests")
	Value     float64           `json:"value"`              // The measured value
	Timestamp time.Time         `json:"timestamp"`          // When the metric was recorded
	Type      MetricType        `json:"type"`               // Type of metric (counter, gauge, etc.)
	Service   string            `json:"service"`            // Service or application name
	Tags      map[string]string `json:"tags,omitempty"`     // Dimensions for the metric
	TraceID   string            `json:"trace_id,omitempty"` // Optional trace ID for correlation
	Env       string            `json:"env,omitempty"`      // Environment (prod, dev, staging, etc.)
	Host      string            `json:"host,omitempty"`     // Hostname where the metric was generated
}

// HistogramBucket represents a single bucket in a histogram metric
type HistogramBucket struct {
	UpperBound float64 `json:"upper_bound"` // Upper bound of the bucket
	Count      uint64  `json:"count"`       // Number of observations in this bucket
}

// HistogramMetric extends Metric with histogram-specific fields
type HistogramMetric struct {
	Metric
	Buckets    []HistogramBucket   `json:"buckets"`              // Histogram buckets
	Sum        float64             `json:"sum"`                  // Sum of all observed values
	Count      uint64              `json:"count"`                // Count of observations
	Percentile map[float64]float64 `json:"percentile,omitempty"` // Optional pre-calculated percentiles
}

// NewMetric creates a new metric with the current timestamp
func NewMetric(name string, value float64, metricType MetricType, service string) *Metric {
	return &Metric{
		Name:      name,
		Value:     value,
		Timestamp: time.Now().UTC(),
		Type:      metricType,
		Service:   service,
		Tags:      make(map[string]string),
	}
}

// AddTag adds a tag to the metric
func (m *Metric) AddTag(key, value string) *Metric {
	if m.Tags == nil {
		m.Tags = make(map[string]string)
	}
	m.Tags[key] = value
	return m
}

// WithTrace adds trace context to the metric
func (m *Metric) WithTrace(traceID string) *Metric {
	m.TraceID = traceID
	return m
}

// WithEnv sets the environment for the metric
func (m *Metric) WithEnv(env string) *Metric {
	m.Env = env
	return m
}

// WithHost sets the hostname for the metric
func (m *Metric) WithHost(host string) *Metric {
	m.Host = host
	return m
}

// NewHistogramMetric creates a new histogram metric
func NewHistogramMetric(name string, service string, buckets []float64) *HistogramMetric {
	histogramBuckets := make([]HistogramBucket, len(buckets))
	for i, bound := range buckets {
		histogramBuckets[i] = HistogramBucket{
			UpperBound: bound,
			Count:      0,
		}
	}

	return &HistogramMetric{
		Metric: Metric{
			Name:      name,
			Timestamp: time.Now().UTC(),
			Type:      MetricTypeHistogram,
			Service:   service,
			Tags:      make(map[string]string),
		},
		Buckets:    histogramBuckets,
		Sum:        0,
		Count:      0,
		Percentile: make(map[float64]float64),
	}
}

// Observe adds a single observation to the histogram
func (h *HistogramMetric) Observe(value float64) {
	h.Sum += value
	h.Count++

	// Update buckets - increment ONLY buckets where value is <= upper bound
	for i := range h.Buckets {
		if value <= h.Buckets[i].UpperBound {
			h.Buckets[i].Count++
		}
	}
}
