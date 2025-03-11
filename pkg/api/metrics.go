package api

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/karansingh/pulse/pkg/models"
)

// MetricRequest represents the expected format for metric submissions
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

// MetricResponse represents the API response for metric submission
type MetricResponse struct {
	Status  string `json:"status"`
	ID      string `json:"id,omitempty"`
	Message string `json:"message,omitempty"`
}

// metricsHandler returns a handler for metric ingestion
func (s *Server) metricsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Only accept POST method
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Read the request body
		body, err := io.ReadAll(io.LimitReader(r.Body, 1048576)) // 1MB limit
		if err != nil {
			log.Printf("Error reading request body: %v", err)
			http.Error(w, "Error reading request", http.StatusBadRequest)
			return
		}

		// Deserialize the JSON payload
		var metricRequest MetricRequest
		if err := json.Unmarshal(body, &metricRequest); err != nil {
			log.Printf("Error parsing metric JSON: %v", err)
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}

		// Validate the metric
		if metricRequest.Name == "" {
			log.Printf("Missing required field 'name'")
			http.Error(w, "Missing required field: name", http.StatusBadRequest)
			return
		}

		if metricRequest.Service == "" {
			log.Printf("Missing required field 'service'")
			http.Error(w, "Missing required field: service", http.StatusBadRequest)
			return
		}

		// Convert the request to a Metric model
		metric := models.Metric{
			ID:        generateID(),
			Name:      metricRequest.Name,
			Value:     metricRequest.Value,
			Type:      models.MetricType(metricRequest.Type),
			Service:   metricRequest.Service,
			Tags:      metricRequest.Tags,
			TraceID:   metricRequest.TraceID,
			Env:       metricRequest.Env,
			Host:      metricRequest.Host,
			Timestamp: time.Now(),
		}

		// Parse timestamp if provided
		if metricRequest.Timestamp != "" {
			timestamp, err := time.Parse(time.RFC3339, metricRequest.Timestamp)
			if err != nil {
				log.Printf("Invalid timestamp format: %v", err)
				http.Error(w, "Invalid timestamp format. Expected RFC3339.", http.StatusBadRequest)
				return
			}
			metric.Timestamp = timestamp
		}

		// Process the metric
		if err := s.processor.ProcessMetric(&metric); err != nil {
			log.Printf("Error processing metric: %v", err)
			http.Error(w, fmt.Sprintf("Error processing metric: %v", err), http.StatusInternalServerError)
			return
		}

		// Send success response
		response := MetricResponse{
			Status:  "success",
			ID:      metric.ID,
			Message: fmt.Sprintf("Metric %s processed successfully", metric.Name),
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	}
}

func (s *Server) PrometheusMetrics(w http.ResponseWriter, r *http.Request) {
	// Current timestamp
	now := time.Now().Unix()

	// Generate some basic Prometheus metrics
	w.Header().Set("Content-Type", "text/plain")
	fmt.Fprintf(w, "# HELP http_requests_total The total number of HTTP requests.\n")
	fmt.Fprintf(w, "# TYPE http_requests_total counter\n")
	fmt.Fprintf(w, "http_requests_total{method=\"get\"} %v\n", now%100)
	fmt.Fprintf(w, "http_requests_total{method=\"post\"} %v\n", now%50)

	fmt.Fprintf(w, "# HELP http_request_duration_seconds The HTTP request latencies in seconds.\n")
	fmt.Fprintf(w, "# TYPE http_request_duration_seconds histogram\n")
	fmt.Fprintf(w, "http_request_duration_seconds_sum %v\n", now%10)
	fmt.Fprintf(w, "http_request_duration_seconds_count %v\n", now%300)
}
