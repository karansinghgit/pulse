package api

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/karansingh/pulse/pkg/models"
)

// LogRequest represents the expected request format for submitting logs
type LogRequest struct {
	Message   string            `json:"message"`
	Level     string            `json:"level"`
	Service   string            `json:"service"`
	Timestamp string            `json:"timestamp,omitempty"`
	Tags      map[string]string `json:"tags,omitempty"`
	TraceID   string            `json:"trace_id,omitempty"`
	SpanID    string            `json:"span_id,omitempty"`
	Env       string            `json:"env,omitempty"`
	Host      string            `json:"host,omitempty"`
	Source    string            `json:"source,omitempty"`
}

// LogResponse represents the API response for log submission
type LogResponse struct {
	Status  string `json:"status"`
	ID      string `json:"id,omitempty"`
	Message string `json:"message,omitempty"`
	TraceID string `json:"trace_id,omitempty"`
}

// logsHandler returns a handler for log ingestion
func (s *Server) logsHandler() http.HandlerFunc {
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
		defer r.Body.Close()

		// Parse the request
		var logReq LogRequest
		if err := json.Unmarshal(body, &logReq); err != nil {
			log.Printf("Error parsing JSON: %v", err)
			http.Error(w, "Invalid JSON format", http.StatusBadRequest)
			return
		}

		// Validate required fields
		if logReq.Message == "" {
			http.Error(w, "Message is required", http.StatusBadRequest)
			return
		}
		if logReq.Service == "" {
			http.Error(w, "Service is required", http.StatusBadRequest)
			return
		}

		// Convert to log level
		var level models.LogLevel
		switch logReq.Level {
		case "DEBUG", "debug":
			level = models.LogLevelDebug
		case "INFO", "info":
			level = models.LogLevelInfo
		case "WARNING", "WARN", "warning", "warn":
			level = models.LogLevelWarning
		case "ERROR", "error":
			level = models.LogLevelError
		case "FATAL", "fatal":
			level = models.LogLevelFatal
		default:
			level = models.LogLevelInfo // Default to INFO if not specified
		}

		// Create a log entry
		logEntry := models.NewLogEntry(logReq.Service, logReq.Message, level)

		// Check for trace context in request body or HTTP headers
		traceID := logReq.TraceID
		spanID := logReq.SpanID

		// If not in the request body, try to extract from headers
		if traceID == "" {
			traceCtx := ExtractTraceContext(r)
			if traceCtx != nil {
				traceID = traceCtx.TraceID
				spanID = traceCtx.SpanID
			}
		}

		// Add trace context to log entry
		if traceID != "" || spanID != "" {
			logEntry.WithTrace(traceID, spanID)
		}

		// Add optional fields
		if logReq.Tags != nil {
			for k, v := range logReq.Tags {
				logEntry.AddTag(k, v)
			}
		}
		if logReq.Env != "" {
			logEntry.WithEnv(logReq.Env)
		}
		if logReq.Host != "" {
			logEntry.WithHost(logReq.Host)
		}
		if logReq.Source != "" {
			logEntry.Source = logReq.Source
		}

		// Parse timestamp if provided
		if logReq.Timestamp != "" {
			ts, err := time.Parse(time.RFC3339, logReq.Timestamp)
			if err != nil {
				log.Printf("Error parsing timestamp: %v", err)
				// Don't fail, just use the current time
			} else {
				logEntry.Timestamp = ts
			}
		}

		// Process the log entry
		if err := s.processor.ProcessLog(logEntry); err != nil {
			log.Printf("Error processing log: %v", err)
			http.Error(w, "Error processing log", http.StatusInternalServerError)
			return
		}

		// Return success
		response := LogResponse{
			Status:  "ok",
			ID:      logEntry.ID,
			Message: "Log entry received and processed",
			TraceID: logEntry.TraceID,
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	}
}
