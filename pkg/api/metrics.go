package api

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/karansingh/pulse/pkg/models"
)

// MetricRequest represents the expected request format for submitting metrics
type MetricRequest struct {
	Name      string            `json:"name"`                // Metric name (e.g., "http.requests")
	Value     float64           `json:"value"`               // The measured value
	Type      string            `json:"type,omitempty"`      // Type of metric (counter, gauge, histogram)
	Service   string            `json:"service"`             // Service or application name
	Timestamp string            `json:"timestamp,omitempty"` // Optional timestamp in RFC3339 format
	Tags      map[string]string `json:"tags,omitempty"`      // Dimensions for the metric
	TraceID   string            `json:"trace_id,omitempty"`  // Optional trace ID for correlation
	Env       string            `json:"env,omitempty"`       // Environment (prod, dev, staging, etc.)
	Host      string            `json:"host,omitempty"`      // Hostname where the metric was generated
}

// HistogramMetricRequest extends MetricRequest with histogram-specific fields
type HistogramMetricRequest struct {
	MetricRequest
	Buckets []float64 `json:"buckets,omitempty"` // Bucket boundaries for histogram
}

// MetricResponse represents the API response for metric submission
type MetricResponse struct {
	Status  string `json:"status"`
	ID      string `json:"id,omitempty"`
	Message string `json:"message,omitempty"`
	TraceID string `json:"trace_id,omitempty"`
}

// metricsHandler returns a handler for metric ingestion and fetching
func (s *Server) metricsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			s.handleMetricPost(w, r)
		case http.MethodGet:
			s.handleMetricGet(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

// handleMetricPost processes POST requests to /metrics for submitting metrics
func (s *Server) handleMetricPost(w http.ResponseWriter, r *http.Request) {
	// Read the request body
	body, err := io.ReadAll(io.LimitReader(r.Body, 1048576)) // 1MB limit
	if err != nil {
		log.Printf("Error reading request body: %v", err)
		http.Error(w, "Error reading request", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Extract trace context from headers (to be used if not in the request body)
	traceCtx := ExtractTraceContext(r)

	// Check content type to determine format
	contentType := r.Header.Get("Content-Type")
	if strings.Contains(contentType, "application/json") {
		s.handleJSONMetric(w, body, traceCtx)
	} else if strings.Contains(contentType, "text/plain") {
		// Handle Prometheus format
		s.handlePrometheusMetric(w, body, traceCtx)
	} else {
		// Default to JSON if content type is not specified
		s.handleJSONMetric(w, body, traceCtx)
	}
}

// handleJSONMetric processes metrics in JSON format
func (s *Server) handleJSONMetric(w http.ResponseWriter, body []byte, traceCtx *TraceContext) {
	// Try to parse as a regular metric first
	var metricReq MetricRequest
	if err := json.Unmarshal(body, &metricReq); err != nil {
		log.Printf("Error parsing JSON metric: %v", err)
		http.Error(w, "Invalid JSON format", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if metricReq.Name == "" {
		http.Error(w, "Metric name is required", http.StatusBadRequest)
		return
	}
	if metricReq.Service == "" {
		http.Error(w, "Service name is required", http.StatusBadRequest)
		return
	}

	// Apply trace context from headers if not in request
	if metricReq.TraceID == "" && traceCtx != nil {
		metricReq.TraceID = traceCtx.TraceID
	}

	// Determine metric type
	var metricType models.MetricType
	switch strings.ToLower(metricReq.Type) {
	case "counter", "c":
		metricType = models.MetricTypeCounter
	case "gauge", "g":
		metricType = models.MetricTypeGauge
	case "histogram", "h":
		// If it's a histogram, we need to check if we have bucket information
		var histogramReq HistogramMetricRequest
		if err := json.Unmarshal(body, &histogramReq); err != nil {
			log.Printf("Error parsing histogram metric: %v", err)
			http.Error(w, "Invalid histogram format", http.StatusBadRequest)
			return
		}

		// Apply trace context from headers if not in request
		if histogramReq.TraceID == "" && traceCtx != nil {
			histogramReq.TraceID = traceCtx.TraceID
		}

		// Create and save histogram metric
		histMetric := s.createHistogramMetric(histogramReq)

		// Access the embedded Metric field for processing
		if err := s.processor.ProcessMetric(&histMetric.Metric); err != nil {
			log.Printf("Error processing histogram metric: %v", err)
			http.Error(w, "Error processing metric", http.StatusInternalServerError)
			return
		}

		// Return success
		response := MetricResponse{
			Status:  "ok",
			ID:      histMetric.ID,
			Message: "Histogram metric received and processed",
			TraceID: histMetric.TraceID,
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
		return
	default:
		// Default to gauge if not specified
		metricType = models.MetricTypeGauge
	}

	// Create a metric entry
	metric := s.createMetric(metricReq, metricType)

	// Process the metric
	if err := s.processor.ProcessMetric(metric); err != nil {
		log.Printf("Error processing metric: %v", err)
		http.Error(w, "Error processing metric", http.StatusInternalServerError)
		return
	}

	// Return success
	response := MetricResponse{
		Status:  "ok",
		ID:      metric.ID,
		Message: "Metric received and processed",
		TraceID: metric.TraceID,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// createMetric creates a new metric from the request
func (s *Server) createMetric(req MetricRequest, metricType models.MetricType) *models.Metric {
	metric := models.NewMetric(req.Name, req.Value, metricType, req.Service)

	// Add optional fields
	if req.Tags != nil {
		for k, v := range req.Tags {
			metric.AddTag(k, v)
		}
	}
	if req.TraceID != "" {
		metric.WithTrace(req.TraceID)
	}
	if req.Env != "" {
		metric.WithEnv(req.Env)
	}
	if req.Host != "" {
		metric.WithHost(req.Host)
	}

	// Parse timestamp if provided
	if req.Timestamp != "" {
		ts, err := time.Parse(time.RFC3339, req.Timestamp)
		if err != nil {
			log.Printf("Error parsing timestamp: %v", err)
			// Don't fail, just use the current time
		} else {
			metric.Timestamp = ts
		}
	}

	return metric
}

// createHistogramMetric creates a new histogram metric from the request
func (s *Server) createHistogramMetric(req HistogramMetricRequest) *models.HistogramMetric {
	// Use default buckets if none provided
	buckets := req.Buckets
	if len(buckets) == 0 {
		buckets = []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10}
	}

	histMetric := models.NewHistogramMetric(req.Name, req.Service, buckets)

	// Add optional fields
	if req.Tags != nil {
		for k, v := range req.Tags {
			histMetric.AddTag(k, v)
		}
	}
	if req.TraceID != "" {
		histMetric.WithTrace(req.TraceID)
	}
	if req.Env != "" {
		histMetric.WithEnv(req.Env)
	}
	if req.Host != "" {
		histMetric.WithHost(req.Host)
	}

	// Parse timestamp if provided
	if req.Timestamp != "" {
		ts, err := time.Parse(time.RFC3339, req.Timestamp)
		if err != nil {
			log.Printf("Error parsing timestamp: %v", err)
			// Don't fail, just use the current time
		} else {
			histMetric.Timestamp = ts
		}
	}

	// Record the observation
	histMetric.Observe(req.Value)

	return histMetric
}

// handlePrometheusMetric processes metrics in Prometheus format
func (s *Server) handlePrometheusMetric(w http.ResponseWriter, body []byte, traceCtx *TraceContext) {
	metrics := parsePrometheusFormat(string(body))

	if len(metrics) == 0 {
		http.Error(w, "No valid metrics found in Prometheus format", http.StatusBadRequest)
		return
	}

	// Apply trace context to all metrics if available
	if traceCtx != nil && traceCtx.TraceID != "" {
		for _, metric := range metrics {
			metric.WithTrace(traceCtx.TraceID)
		}
	}

	// Process each metric
	for _, metric := range metrics {
		if err := s.processor.ProcessMetric(metric); err != nil {
			log.Printf("Error processing Prometheus metric: %v", err)
			http.Error(w, "Error processing metrics", http.StatusInternalServerError)
			return
		}
	}

	// Return success
	response := MetricResponse{
		Status:  "ok",
		Message: fmt.Sprintf("%d metrics received and processed", len(metrics)),
	}

	// Include trace ID in response if available
	if traceCtx != nil && traceCtx.TraceID != "" {
		response.TraceID = traceCtx.TraceID
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// parsePrometheusFormat parses metrics in Prometheus exposition format
// See: https://prometheus.io/docs/instrumenting/exposition_formats/
func parsePrometheusFormat(input string) []*models.Metric {
	var metrics []*models.Metric

	lines := strings.Split(input, "\n")

	var currentType string

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			// Process comment lines to extract metadata
			if strings.HasPrefix(line, "# TYPE ") {
				parts := strings.SplitN(line[7:], " ", 2)
				if len(parts) == 2 {
					currentType = parts[1]
				}
			}
			continue
		}

		// Process metric line
		var metricName string
		var metricLabels map[string]string
		var metricValue float64

		// Split into name+labels and value
		parts := strings.Split(line, " ")
		if len(parts) < 2 {
			continue
		}

		// Parse value
		val, err := strconv.ParseFloat(parts[len(parts)-1], 64)
		if err != nil {
			continue
		}
		metricValue = val

		// Parse name and labels
		nameAndLabels := parts[0]

		// Check if there are labels
		labelStart := strings.Index(nameAndLabels, "{")
		if labelStart == -1 {
			// No labels
			metricName = nameAndLabels
			metricLabels = make(map[string]string)
		} else {
			// Has labels
			metricName = nameAndLabels[:labelStart]
			labelStr := nameAndLabels[labelStart+1 : len(nameAndLabels)-1] // remove { and }

			metricLabels = make(map[string]string)
			labelParts := strings.Split(labelStr, ",")
			for _, lp := range labelParts {
				labelKeyValue := strings.Split(lp, "=")
				if len(labelKeyValue) == 2 {
					// Remove quotes from label value if present
					labelValue := labelKeyValue[1]
					if strings.HasPrefix(labelValue, "\"") && strings.HasSuffix(labelValue, "\"") {
						labelValue = labelValue[1 : len(labelValue)-1]
					}
					metricLabels[labelKeyValue[0]] = labelValue
				}
			}
		}

		// Determine metric type
		var metricType models.MetricType
		switch currentType {
		case "counter":
			metricType = models.MetricTypeCounter
		case "gauge":
			metricType = models.MetricTypeGauge
		case "histogram":
			// TODO: Implement proper histogram parsing for Prometheus format
			metricType = models.MetricTypeGauge
		case "summary":
			metricType = models.MetricTypeSummary
		default:
			metricType = models.MetricTypeGauge
		}

		// Extract service name from labels if available
		service := "default"
		if svc, ok := metricLabels["service"]; ok {
			service = svc
			delete(metricLabels, "service") // Remove to avoid duplication
		}

		// Create the metric
		metric := models.NewMetric(metricName, metricValue, metricType, service)

		// Add labels as tags
		for k, v := range metricLabels {
			metric.AddTag(k, v)
		}

		metrics = append(metrics, metric)
	}

	return metrics
}

// handleMetricGet processes GET requests to /metrics for scraping metrics
func (s *Server) handleMetricGet(w http.ResponseWriter, _ *http.Request) {
	// Retrieve metrics from storage
	// TODO: Implement proper metric retrieval from storage
	// For now, we'll return a sample Prometheus format output

	now := time.Now().Unix()

	// Set Prometheus content type
	w.Header().Set("Content-Type", "text/plain; version=0.0.4")

	// Write sample metrics in Prometheus format
	fmt.Fprintf(w, "# HELP process_cpu_seconds_total Total user and system CPU time spent in seconds.\n")
	fmt.Fprintf(w, "# TYPE process_cpu_seconds_total counter\n")
	fmt.Fprintf(w, "process_cpu_seconds_total %v\n\n", float64(now%100)*0.01)

	fmt.Fprintf(w, "# HELP process_resident_memory_bytes Resident memory size in bytes.\n")
	fmt.Fprintf(w, "# TYPE process_resident_memory_bytes gauge\n")
	fmt.Fprintf(w, "process_resident_memory_bytes %v\n\n", 1024*1024*float64(now%100))

	fmt.Fprintf(w, "# HELP http_request_duration_seconds HTTP request duration in seconds.\n")
	fmt.Fprintf(w, "# TYPE http_request_duration_seconds histogram\n")
	fmt.Fprintf(w, "http_request_duration_seconds_bucket{le=\"0.1\"} %v\n", now%50)
	fmt.Fprintf(w, "http_request_duration_seconds_bucket{le=\"0.5\"} %v\n", now%100)
	fmt.Fprintf(w, "http_request_duration_seconds_bucket{le=\"1\"} %v\n", now%200)
	fmt.Fprintf(w, "http_request_duration_seconds_bucket{le=\"+Inf\"} %v\n", now%300)
	fmt.Fprintf(w, "http_request_duration_seconds_sum %v\n", float64(now%1000)*0.01)
	fmt.Fprintf(w, "http_request_duration_seconds_count %v\n", now%300)
}
