package api

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/karansingh/pulse/pkg/models"
)

// SpanRequest represents the expected request format for submitting a span
type SpanRequest struct {
	ID         string            `json:"id,omitempty"`          // Optional identifier for this span
	TraceID    string            `json:"trace_id,omitempty"`    // ID of the trace this span belongs to
	ParentID   string            `json:"parent_id,omitempty"`   // ID of the parent span, if any
	Name       string            `json:"name"`                  // Name of the operation
	Service    string            `json:"service"`               // Service that executed the operation
	StartTime  string            `json:"start_time,omitempty"`  // When the span started, in RFC3339 format
	EndTime    string            `json:"end_time,omitempty"`    // When the span ended, in RFC3339 format
	Duration   int64             `json:"duration_ms,omitempty"` // Duration in milliseconds (alternative to end_time)
	Status     string            `json:"status,omitempty"`      // Status of the operation
	Tags       map[string]string `json:"tags,omitempty"`        // Additional metadata as key-value pairs
	Logs       []SpanLogRequest  `json:"logs,omitempty"`        // Time-stamped logs attached to this span
	Env        string            `json:"env,omitempty"`         // Environment (prod, dev, staging, etc.)
	Host       string            `json:"host,omitempty"`        // Hostname where the span was generated
	IsFinished bool              `json:"is_finished,omitempty"` // Whether the span has been completed
}

// SpanLogRequest represents a log entry attached to a span
type SpanLogRequest struct {
	Timestamp string            `json:"timestamp,omitempty"` // When the log was generated, in RFC3339 format
	Fields    map[string]string `json:"fields"`              // Log data as key-value pairs
}

// TraceRequest represents the expected request format for submitting a complete trace
type TraceRequest struct {
	ID     string        `json:"id,omitempty"`     // Optional identifier for the trace
	Spans  []SpanRequest `json:"spans"`            // Collection of spans in this trace
	Status string        `json:"status,omitempty"` // Overall status of the trace
}

// SpanResponse represents the API response for span submission
type SpanResponse struct {
	Status  string `json:"status"`
	ID      string `json:"id,omitempty"`
	TraceID string `json:"trace_id,omitempty"`
	Message string `json:"message,omitempty"`
}

// TraceResponse represents the API response for trace submission
type TraceResponse struct {
	Status  string `json:"status"`
	ID      string `json:"id,omitempty"`
	Message string `json:"message,omitempty"`
	Spans   int    `json:"spans,omitempty"`
}

// tracesHandler returns a handler for trace ingestion
func (s *Server) tracesHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Extract trace context from headers (to be used if not in the request body)
		traceCtx := ExtractTraceContext(r)

		// Read the request body
		body, err := io.ReadAll(io.LimitReader(r.Body, 1048576)) // 1MB limit
		if err != nil {
			log.Printf("Error reading request body: %v", err)
			http.Error(w, "Error reading request", http.StatusBadRequest)
			return
		}
		defer r.Body.Close()

		// Parse the request
		var traceReq TraceRequest
		if err := json.Unmarshal(body, &traceReq); err != nil {
			log.Printf("Error parsing JSON: %v", err)
			http.Error(w, "Invalid JSON format", http.StatusBadRequest)
			return
		}

		// Validate required fields
		if len(traceReq.Spans) == 0 {
			http.Error(w, "At least one span is required", http.StatusBadRequest)
			return
		}

		// Apply trace context from headers if not in request
		if traceReq.ID == "" && traceCtx != nil && traceCtx.TraceID != "" {
			traceReq.ID = traceCtx.TraceID
		}

		// Process the trace
		trace, err := s.processTraceRequest(traceReq)
		if err != nil {
			log.Printf("Error processing trace: %v", err)
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Save the trace
		if err := s.processor.ProcessTrace(trace); err != nil {
			log.Printf("Error saving trace: %v", err)
			http.Error(w, "Error processing trace", http.StatusInternalServerError)
			return
		}

		// Return success
		response := TraceResponse{
			Status:  "ok",
			ID:      trace.ID,
			Message: "Trace received and processed",
			Spans:   len(trace.Spans),
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	}
}

// spansHandler returns a handler for individual span submission
func (s *Server) spansHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Extract trace context from headers (to be used if not in the request body)
		traceCtx := ExtractTraceContext(r)

		// Read the request body
		body, err := io.ReadAll(io.LimitReader(r.Body, 1048576)) // 1MB limit
		if err != nil {
			log.Printf("Error reading request body: %v", err)
			http.Error(w, "Error reading request", http.StatusBadRequest)
			return
		}
		defer r.Body.Close()

		// Parse the request
		var spanReq SpanRequest
		if err := json.Unmarshal(body, &spanReq); err != nil {
			log.Printf("Error parsing JSON: %v", err)
			http.Error(w, "Invalid JSON format", http.StatusBadRequest)
			return
		}

		// Validate required fields
		if spanReq.Name == "" {
			http.Error(w, "Span name is required", http.StatusBadRequest)
			return
		}
		if spanReq.Service == "" {
			http.Error(w, "Service name is required", http.StatusBadRequest)
			return
		}

		// Apply trace context from headers if not in request
		if spanReq.TraceID == "" && traceCtx != nil {
			spanReq.TraceID = traceCtx.TraceID

			// If no parent ID is specified but we have a span ID in the trace context,
			// use that as the parent ID
			if spanReq.ParentID == "" && traceCtx.SpanID != "" {
				spanReq.ParentID = traceCtx.SpanID
			}
		}

		// Process the span
		span, traceID, err := s.processSpanRequest(spanReq)
		if err != nil {
			log.Printf("Error processing span: %v", err)
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Save the span
		if err := s.processor.ProcessSpan(span); err != nil {
			log.Printf("Error saving span: %v", err)
			http.Error(w, "Error processing span", http.StatusInternalServerError)
			return
		}

		// Return success
		response := SpanResponse{
			Status:  "ok",
			ID:      span.ID,
			TraceID: traceID,
			Message: "Span received and processed",
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	}
}

// processTraceRequest converts a TraceRequest into a Trace model
func (s *Server) processTraceRequest(req TraceRequest) (*models.Trace, error) {
	// Generate trace ID if not provided
	traceID := req.ID
	if traceID == "" {
		traceID = models.GenerateID()
	}

	// Identify root span(s) - spans without parent ID
	var rootSpans []*models.Span

	// Process all spans
	spans := make([]*models.Span, 0, len(req.Spans))
	for _, spanReq := range req.Spans {
		spanReq.TraceID = traceID // Ensure all spans have the same trace ID
		span, _, err := s.processSpanRequest(spanReq)
		if err != nil {
			return nil, err
		}

		spans = append(spans, span)

		// Check if this is a root span (no parent ID)
		if span.ParentID == "" {
			rootSpans = append(rootSpans, span)
		}
	}

	// If we have no root spans, pick the first span as root
	if len(rootSpans) == 0 && len(spans) > 0 {
		rootSpans = []*models.Span{spans[0]}
	}

	// Create the trace with the first root span as the primary root
	trace := &models.Trace{
		ID:    traceID,
		Spans: spans,
		Root:  rootSpans[0],
	}

	// Set trace status
	if req.Status != "" {
		switch strings.ToUpper(req.Status) {
		case "OK":
			trace.Status = models.SpanStatusOK
		case "ERROR":
			trace.Status = models.SpanStatusError
		case "CANCELED":
			trace.Status = models.SpanStatusCanceled
		default:
			trace.Status = models.SpanStatusOK
		}
	} else {
		// Derive status from root span
		trace.Status = rootSpans[0].Status
	}

	return trace, nil
}

// processSpanRequest converts a SpanRequest into a Span model
func (s *Server) processSpanRequest(req SpanRequest) (*models.Span, string, error) {
	// Generate trace ID if not provided
	traceID := req.TraceID
	if traceID == "" {
		traceID = models.GenerateID()
	}

	// Create the span
	var span *models.Span
	if req.ID != "" {
		// Use provided ID
		span = &models.Span{
			ID:        req.ID,
			TraceID:   traceID,
			Name:      req.Name,
			Service:   req.Service,
			StartTime: time.Now().UTC(), // Default to now
			Tags:      make(map[string]string),
			Status:    models.SpanStatusOK,
		}
	} else {
		// Generate new ID
		span = models.NewSpan(req.Name, req.Service, traceID)
	}

	// Set optional fields
	if req.ParentID != "" {
		span.SetParent(req.ParentID)
	}

	if req.StartTime != "" {
		startTime, err := time.Parse(time.RFC3339, req.StartTime)
		if err == nil {
			span.StartTime = startTime
		}
	}

	if req.EndTime != "" {
		endTime, err := time.Parse(time.RFC3339, req.EndTime)
		if err == nil {
			span.EndTime = endTime
			span.Duration = endTime.Sub(span.StartTime).Milliseconds()
			span.IsFinished = true
		}
	} else if req.Duration > 0 {
		// Calculate end time from duration
		span.Duration = req.Duration
		span.EndTime = span.StartTime.Add(time.Duration(req.Duration) * time.Millisecond)
		span.IsFinished = true
	}

	if req.Status != "" {
		switch strings.ToUpper(req.Status) {
		case "OK":
			span.SetStatus(models.SpanStatusOK)
		case "ERROR":
			span.SetStatus(models.SpanStatusError)
		case "CANCELED":
			span.SetStatus(models.SpanStatusCanceled)
		}
	}

	if req.Tags != nil {
		for k, v := range req.Tags {
			span.AddTag(k, v)
		}
	}

	if req.Logs != nil {
		for _, logReq := range req.Logs {
			logFields := logReq.Fields
			if logFields == nil {
				logFields = make(map[string]string)
			}

			log := models.SpanLog{
				Timestamp: time.Now().UTC(),
				Fields:    logFields,
			}

			if logReq.Timestamp != "" {
				timestamp, err := time.Parse(time.RFC3339, logReq.Timestamp)
				if err == nil {
					log.Timestamp = timestamp
				}
			}

			span.Logs = append(span.Logs, log)
		}
	}

	if req.Env != "" {
		span.WithEnv(req.Env)
	}

	if req.Host != "" {
		span.WithHost(req.Host)
	}

	if req.IsFinished && !span.IsFinished {
		span.Finish()
	}

	return span, traceID, nil
}
