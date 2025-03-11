package api

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/karansingh/pulse/pkg/models"
)

// Shared counters for WebSocket streaming
var (
	// Mutex to protect shared counters
	streamCountersMutex sync.Mutex

	// Shared counters for streaming summary
	logsStreamingCounter    int
	metricsStreamingCounter int
	tracesStreamingCounter  int
)

// QueryParams represents the parameters for querying data
type QueryParams struct {
	Service   string            // Service name to filter by
	Limit     int               // Maximum number of results
	Since     time.Time         // Start time for the query
	Until     time.Time         // End time for the query
	Filters   map[string]string // Additional filters
	OrderBy   string            // Field to order by
	OrderDesc bool              // True for descending order
	Offset    int               // For pagination
	Level     string            // Level to filter by
	TraceID   string            // Trace ID to filter by
	Search    string            // Search term
}

// WSMessage represents a message sent over WebSocket
type WSMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// generateID generates a unique ID for entries
func generateID() string {
	return fmt.Sprintf("%d-%s", time.Now().UnixNano(), strings.ReplaceAll(uuidMini(), "-", ""))
}

// uuidMini generates a simplified UUID
func uuidMini() string {
	b := make([]byte, 4)
	_, err := rand.Read(b)
	if err != nil {
		log.Printf("Warning: failed to generate UUID: %v", err)
		// Fallback to less secure method
		return fmt.Sprintf("%x", time.Now().UnixNano())
	}
	return fmt.Sprintf("%x", b)
}

// parseQueryParams extracts query parameters from an HTTP request
func parseQueryParams(r *http.Request) *models.QueryParams {
	// Remove excessive logging
	// log.Printf("Parsing query parameters from request: %s", r.URL.String())

	// Parse query parameters
	query := &models.QueryParams{
		Limit: 100, // Default limit
	}

	// Get service filter
	service := r.URL.Query().Get("service")
	if service != "" {
		query.Service = service
		// log.Printf("Filtering by service: %s", service)
	}

	// Get level filter (for logs)
	level := r.URL.Query().Get("level")
	if level != "" {
		query.Level = level
		// log.Printf("Filtering by level: %s", level)
	}

	// Get trace ID filter
	traceID := r.URL.Query().Get("trace_id")
	if traceID != "" {
		query.TraceID = traceID
		// log.Printf("Filtering by trace ID: %s", traceID)
	}

	// Get search filter
	search := r.URL.Query().Get("search")
	if search != "" {
		query.Search = search
		// log.Printf("Filtering by search term: %s", search)
	}

	// Get limit
	limitStr := r.URL.Query().Get("limit")
	if limitStr != "" {
		limit, err := strconv.Atoi(limitStr)
		if err == nil && limit > 0 {
			query.Limit = limit
			// log.Printf("Using limit: %d", limit)
		}
	}

	// Get time range
	timeRange := r.URL.Query().Get("time_range")
	if timeRange != "" {
		// log.Printf("Using time range: %s", timeRange)

		// Parse the time range (e.g., "1h", "30m", "1d")
		duration, err := parseDuration(timeRange)
		if err == nil {
			query.Since = time.Now().Add(-duration)
			// log.Printf("Calculated since time: %s", query.Since)
		} else {
			log.Printf("Error parsing time range: %v", err)
		}
	} else {
		// Default to last hour if no time range specified
		query.Since = time.Now().Add(-1 * time.Hour)
		// log.Printf("Using default time range (1h), since: %s", query.Since)
	}

	// Get explicit since time
	sinceStr := r.URL.Query().Get("since")
	if sinceStr != "" {
		since, err := time.Parse(time.RFC3339, sinceStr)
		if err == nil {
			query.Since = since
			// log.Printf("Using explicit since time: %s", since)
		} else {
			log.Printf("Error parsing since time: %v", err)
		}
	}

	// Get explicit until time
	untilStr := r.URL.Query().Get("until")
	if untilStr != "" {
		until, err := time.Parse(time.RFC3339, untilStr)
		if err == nil {
			query.Until = until
			// log.Printf("Using explicit until time: %s", until)
		} else {
			log.Printf("Error parsing until time: %v", err)
		}
	}

	// Get order by
	orderBy := r.URL.Query().Get("order_by")
	if orderBy != "" {
		query.OrderBy = orderBy
		// log.Printf("Ordering by: %s", orderBy)
	}

	// Get order direction
	orderDesc := r.URL.Query().Get("order_desc")
	if orderDesc == "true" {
		query.OrderDesc = true
		// log.Printf("Using descending order")
	}

	// Get offset for pagination
	offsetStr := r.URL.Query().Get("offset")
	if offsetStr != "" {
		offset, err := strconv.Atoi(offsetStr)
		if err == nil && offset >= 0 {
			query.Offset = offset
			// log.Printf("Using offset: %d", offset)
		} else {
			log.Printf("Error parsing offset: %v", err)
		}
	}

	// Parse additional filters
	for key, values := range r.URL.Query() {
		if strings.HasPrefix(key, "filter.") && len(values) > 0 {
			filterName := strings.TrimPrefix(key, "filter.")
			if query.Filters == nil {
				query.Filters = make(map[string]string)
			}
			query.Filters[filterName] = values[0]
			// log.Printf("Added filter %s: %s", filterName, values[0])
		}
	}

	// log.Printf("Final query parameters: %+v", query)
	return query
}

// parseDuration parses duration strings like "5m", "1h", "7d"
func parseDuration(s string) (time.Duration, error) {
	// Handle special case for days
	if strings.HasSuffix(s, "d") {
		days, err := strconv.Atoi(s[:len(s)-1])
		if err != nil {
			return 0, err
		}
		return time.Duration(days) * 24 * time.Hour, nil
	}

	// Otherwise, use the standard Go time.ParseDuration
	return time.ParseDuration(s)
}

// apiServicesHandler returns a handler for querying available services
func (s *Server) apiServicesHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Query available services from storage
		services, err := s.processor.GetServices()
		if err != nil {
			http.Error(w, fmt.Sprintf("Error querying services: %v", err), http.StatusInternalServerError)
			return
		}

		// Send response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(services)
	}
}

// apiStatsHandler returns a handler for querying summary statistics
func (s *Server) apiStatsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Parse query parameters
		query := parseQueryParams(r)

		// Query stats from storage
		stats, err := s.processor.GetStats(query)
		if err != nil {
			http.Error(w, fmt.Sprintf("Error querying stats: %v", err), http.StatusInternalServerError)
			return
		}

		// Send response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(stats)
	}
}

// apiMetricsHandler returns a handler for querying metrics
func (s *Server) apiMetricsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Parse query parameters
		query := parseQueryParams(r)

		// Query metrics from storage
		metrics, err := s.processor.QueryMetrics(query)
		if err != nil {
			http.Error(w, fmt.Sprintf("Error querying metrics: %v", err), http.StatusInternalServerError)
			return
		}

		// Send response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(metrics)
	}
}

// apiTracesHandler returns a handler for querying traces
func (s *Server) apiTracesHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Parse query parameters
		query := parseQueryParams(r)

		// Query traces from storage
		traces, err := s.processor.QueryTraces(query)
		if err != nil {
			http.Error(w, fmt.Sprintf("Error querying traces: %v", err), http.StatusInternalServerError)
			return
		}

		// Send response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(traces)
	}
}

// apiSpansHandler returns a handler for querying spans
func (s *Server) apiSpansHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Parse query parameters
		query := parseQueryParams(r)

		// Query spans from storage
		spans, err := s.processor.QuerySpans(query)
		if err != nil {
			http.Error(w, fmt.Sprintf("Error querying spans: %v", err), http.StatusInternalServerError)
			return
		}

		// Send response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(spans)
	}
}

// wsLogsHandler handles WebSocket connections for real-time log updates
func (s *Server) wsLogsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Upgrade HTTP connection to WebSocket
		conn, err := s.wsUpgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("Error upgrading to WebSocket: %v", err)
			return
		}

		// Register connection
		s.connLock.Lock()
		s.activeConns[conn] = true
		s.connLock.Unlock()

		// Schedule cleanup when connection closes
		defer func() {
			conn.Close()
			s.connLock.Lock()
			delete(s.activeConns, conn)
			s.connLock.Unlock()
		}()

		// Parse query parameters
		query := parseQueryParams(r)

		// Start real-time log streaming
		s.streamLogs(conn, query)
	}
}

// wsMetricsHandler handles WebSocket connections for real-time metric updates
func (s *Server) wsMetricsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Upgrade HTTP connection to WebSocket
		conn, err := s.wsUpgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("Error upgrading to WebSocket: %v", err)
			return
		}

		// Register connection
		s.connLock.Lock()
		s.activeConns[conn] = true
		s.connLock.Unlock()

		// Schedule cleanup when connection closes
		defer func() {
			conn.Close()
			s.connLock.Lock()
			delete(s.activeConns, conn)
			s.connLock.Unlock()
		}()

		// Parse query parameters
		query := parseQueryParams(r)

		// Start real-time metric streaming
		s.streamMetrics(conn, query)
	}
}

// wsTracesHandler handles WebSocket connections for real-time trace updates
func (s *Server) wsTracesHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Upgrade HTTP connection to WebSocket
		conn, err := s.wsUpgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("Error upgrading to WebSocket: %v", err)
			return
		}

		// Register connection
		s.connLock.Lock()
		s.activeConns[conn] = true
		s.connLock.Unlock()

		// Schedule cleanup when connection closes
		defer func() {
			conn.Close()
			s.connLock.Lock()
			delete(s.activeConns, conn)
			s.connLock.Unlock()
		}()

		// Parse query parameters
		query := parseQueryParams(r)

		// Start real-time trace streaming
		s.streamTraces(conn, query)
	}
}

// streamLogs streams logs to a WebSocket connection
func (s *Server) streamLogs(conn *websocket.Conn, query *models.QueryParams) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	// Set an absolute since time to avoid retrieving old logs
	// This will only show logs created after the websocket connection was established
	startTime := time.Now()
	query.Since = startTime

	// Read control messages from client
	go func() {
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				// Only log disconnections, not every error
				if !strings.Contains(err.Error(), "websocket: close") {
					log.Printf("WebSocket error: %v", err)
				}
				return // Connection closed or error
			}
		}
	}()

	// Set up a ticker for summary logs
	summaryTicker := time.NewTicker(1 * time.Second)
	defer summaryTicker.Stop()

	// Track statistics for summary logging
	var totalLogsSent int

	// Send statistics periodically
	go func() {
		for {
			select {
			case <-summaryTicker.C:
				if totalLogsSent > 0 {
					log.Printf("Log streaming summary: Sent %d logs in the last second", totalLogsSent)
					totalLogsSent = 0
				}
			}
		}
	}()

	// Wait a short time before the initial query to avoid picking up any logs
	// that might have been generated just before starting
	time.Sleep(500 * time.Millisecond)

	// Initial query
	logs, err := s.processor.QueryLogs(query)
	if err == nil && len(logs) > 0 {
		message := WSMessage{
			Type:    "logs",
			Payload: logs,
		}
		if err := conn.WriteJSON(message); err != nil {
			return
		}

		// Count logs sent for summary
		totalLogsSent += len(logs)

		// Update streaming counter
		streamCountersMutex.Lock()
		logsStreamingCounter += len(logs)
		streamCountersMutex.Unlock()
	} else if err != nil {
		// Only log actual errors
		log.Printf("Log query error: %v", err)
		// Send an error message to the client
		errMessage := WSMessage{
			Type: "error",
			Payload: map[string]string{
				"message": fmt.Sprintf("Query error: %v", err),
			},
		}
		conn.WriteJSON(errMessage)
	}

	// For updates, only look at logs from the last second
	var lastQueryTime time.Time = time.Now()

	// Send updates
	for {
		select {
		case <-ticker.C:
			// Update since time to get only logs since our last query
			query.Since = lastQueryTime
			query.Until = time.Now()
			lastQueryTime = query.Until

			logs, err := s.processor.QueryLogs(query)
			if err != nil {
				errMessage := WSMessage{
					Type: "error",
					Payload: map[string]string{
						"message": fmt.Sprintf("Query error: %v", err),
					},
				}
				conn.WriteJSON(errMessage)
				continue
			}

			if len(logs) > 0 {
				message := WSMessage{
					Type:    "logs",
					Payload: logs,
				}
				if err := conn.WriteJSON(message); err != nil {
					return
				}

				// Count logs sent for summary
				totalLogsSent += len(logs)

				// Update streaming counter
				streamCountersMutex.Lock()
				logsStreamingCounter += len(logs)
				streamCountersMutex.Unlock()
			}
		}
	}
}

// streamMetrics streams metrics to a WebSocket connection
func (s *Server) streamMetrics(conn *websocket.Conn, query *models.QueryParams) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	// Set an absolute since time to avoid retrieving old metrics
	startTime := time.Now()
	query.Since = startTime

	// Read control messages from client
	go func() {
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				// Only log disconnections, not every error
				if !strings.Contains(err.Error(), "websocket: close") {
					log.Printf("WebSocket error: %v", err)
				}
				return // Connection closed or error
			}
		}
	}()

	// Track statistics for summary logging
	var totalMetricsSent int
	summaryTicker := time.NewTicker(1 * time.Second)
	defer summaryTicker.Stop()

	// Send statistics periodically
	go func() {
		for {
			select {
			case <-summaryTicker.C:
				if totalMetricsSent > 0 {
					log.Printf("Metric streaming summary: Sent %d metrics in the last second", totalMetricsSent)
					totalMetricsSent = 0
				}
			}
		}
	}()

	// Initial query
	metrics, err := s.processor.QueryMetrics(query)
	if err == nil && len(metrics) > 0 {
		message := WSMessage{
			Type:    "metrics",
			Payload: metrics,
		}
		if err := conn.WriteJSON(message); err != nil {
			return
		}

		// Count metrics sent for summary
		totalMetricsSent += len(metrics)

		// Update metrics counter
		streamCountersMutex.Lock()
		metricsStreamingCounter += len(metrics)
		streamCountersMutex.Unlock()
	} else if err != nil {
		// Only log actual errors
		log.Printf("Metric query error: %v", err)
	}

	// For updates, only look at metrics from the last second
	var lastQueryTime time.Time = time.Now()

	// Send updates
	for {
		select {
		case <-ticker.C:
			// Update since time to get only metrics since our last query
			query.Since = lastQueryTime
			query.Until = time.Now()
			lastQueryTime = query.Until

			metrics, err := s.processor.QueryMetrics(query)
			if err != nil {
				errMessage := WSMessage{
					Type: "error",
					Payload: map[string]string{
						"message": fmt.Sprintf("Query error: %v", err),
					},
				}
				conn.WriteJSON(errMessage)
				continue
			}

			if len(metrics) > 0 {
				message := WSMessage{
					Type:    "metrics",
					Payload: metrics,
				}
				if err := conn.WriteJSON(message); err != nil {
					return
				}

				// Count metrics sent for summary
				totalMetricsSent += len(metrics)

				// Update metrics counter
				streamCountersMutex.Lock()
				metricsStreamingCounter += len(metrics)
				streamCountersMutex.Unlock()
			}
		}
	}
}

// streamTraces streams traces to a WebSocket connection
func (s *Server) streamTraces(conn *websocket.Conn, query *models.QueryParams) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	// Set an absolute since time to avoid retrieving old traces
	startTime := time.Now()
	query.Since = startTime

	// Read control messages from client
	go func() {
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				// Only log disconnections, not every error
				if !strings.Contains(err.Error(), "websocket: close") {
					log.Printf("WebSocket error: %v", err)
				}
				return // Connection closed or error
			}
		}
	}()

	// Track statistics for summary logging
	var totalTracesSent int
	summaryTicker := time.NewTicker(1 * time.Second)
	defer summaryTicker.Stop()

	// Send statistics periodically
	go func() {
		for {
			select {
			case <-summaryTicker.C:
				if totalTracesSent > 0 {
					log.Printf("Trace streaming summary: Sent %d traces in the last second", totalTracesSent)
					totalTracesSent = 0
				}
			}
		}
	}()

	// Initial query
	traces, err := s.processor.QueryTraces(query)
	if err == nil && len(traces) > 0 {
		message := WSMessage{
			Type:    "traces",
			Payload: traces,
		}
		if err := conn.WriteJSON(message); err != nil {
			return
		}

		// Count traces sent for summary
		totalTracesSent += len(traces)

		// Update counter
		streamCountersMutex.Lock()
		tracesStreamingCounter += len(traces)
		streamCountersMutex.Unlock()
	} else if err != nil {
		// Only log actual errors
		log.Printf("Trace query error: %v", err)
	}

	// For updates, only look at traces from the last second
	var lastQueryTime time.Time = time.Now()

	// Send updates
	for {
		select {
		case <-ticker.C:
			// Update since time to get only traces since our last query
			query.Since = lastQueryTime
			query.Until = time.Now()
			lastQueryTime = query.Until

			traces, err := s.processor.QueryTraces(query)
			if err != nil {
				errMessage := WSMessage{
					Type: "error",
					Payload: map[string]string{
						"message": fmt.Sprintf("Query error: %v", err),
					},
				}
				conn.WriteJSON(errMessage)
				continue
			}

			if len(traces) > 0 {
				message := WSMessage{
					Type:    "traces",
					Payload: traces,
				}
				if err := conn.WriteJSON(message); err != nil {
					return
				}

				// Count traces sent for summary
				totalTracesSent += len(traces)

				// Update counter
				streamCountersMutex.Lock()
				tracesStreamingCounter += len(traces)
				streamCountersMutex.Unlock()
			}
		}
	}
}

// clearHandler returns a handler for clearing all stored data
func (s *Server) clearHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Log the clear operation
		log.Println("Received request to clear all data")

		// Reset counters
		streamCountersMutex.Lock()
		logsStreamingCounter = 0
		metricsStreamingCounter = 0
		tracesStreamingCounter = 0
		streamCountersMutex.Unlock()

		// Return success
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"success","message":"All counters reset"}`))
	}
}
