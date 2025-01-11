package api

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/karansingh/pulse/pkg/models"
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
	q := r.URL.Query()
	params := &models.QueryParams{
		Service:   q.Get("service"),
		OrderBy:   q.Get("order_by"),
		OrderDesc: q.Get("order") == "desc",
		Filters:   make(map[string]string),
	}

	// Parse limit
	if limitStr := q.Get("limit"); limitStr != "" {
		limit, err := strconv.Atoi(limitStr)
		if err == nil && limit > 0 {
			params.Limit = limit
		} else {
			params.Limit = 100 // Default limit
		}
	} else {
		params.Limit = 100 // Default limit
	}

	// Parse offset
	if offsetStr := q.Get("offset"); offsetStr != "" {
		offset, err := strconv.Atoi(offsetStr)
		if err == nil && offset >= 0 {
			params.Offset = offset
		}
	}

	// Parse time ranges
	now := time.Now()

	// Parse 'since' parameter (e.g., "1h", "30m", "1d")
	if sinceStr := q.Get("since"); sinceStr != "" {
		if duration, err := parseDuration(sinceStr); err == nil {
			params.Since = now.Add(-duration)
		} else {
			// Try parsing as RFC3339
			if t, err := time.Parse(time.RFC3339, sinceStr); err == nil {
				params.Since = t
			} else {
				params.Since = now.Add(-time.Hour) // Default to 1 hour ago
			}
		}
	} else {
		params.Since = now.Add(-time.Hour) // Default to 1 hour ago
	}

	// Parse 'until' parameter
	if untilStr := q.Get("until"); untilStr != "" {
		if duration, err := parseDuration(untilStr); err == nil {
			params.Until = now.Add(-duration)
		} else {
			// Try parsing as RFC3339
			if t, err := time.Parse(time.RFC3339, untilStr); err == nil {
				params.Until = t
			} else {
				params.Until = now // Default to now
			}
		}
	} else {
		params.Until = now // Default to now
	}

	// Parse filters (format: key=value or key:*value*)
	for _, filter := range q["filter"] {
		// Handle both equals and contains operators
		if strings.Contains(filter, "=") {
			parts := strings.SplitN(filter, "=", 2)
			if len(parts) == 2 {
				params.Filters[parts[0]] = parts[1]
			}
		} else if strings.Contains(filter, ":") {
			parts := strings.SplitN(filter, ":", 2)
			if len(parts) == 2 {
				// Prefix with ~ to indicate pattern matching
				params.Filters[parts[0]] = "~" + parts[1]
			}
		}
	}

	return params
}

// parseDuration parses a human-readable duration like "30m", "1h", "1d"
func parseDuration(s string) (time.Duration, error) {
	// Convert days to hours for simplicity
	s = strings.ReplaceAll(s, "d", "h*24")

	// Try to parse the standard duration format
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

	// Read control messages from client
	go func() {
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				return // Connection closed or error
			}
		}
	}()

	// Initial query
	logs, err := s.processor.QueryLogs(query)
	if err == nil {
		message := WSMessage{
			Type:    "logs",
			Payload: logs,
		}
		conn.WriteJSON(message)
	}

	// Send updates
	for {
		select {
		case <-ticker.C:
			// Update since time to get only new logs
			query.Since = time.Now().Add(-2 * time.Second)
			query.Until = time.Now()

			logs, err := s.processor.QueryLogs(query)
			if err != nil {
				log.Printf("Error streaming logs: %v", err)
				continue
			}

			if len(logs) > 0 {
				message := WSMessage{
					Type:    "logs",
					Payload: logs,
				}
				if err := conn.WriteJSON(message); err != nil {
					log.Printf("Error sending logs: %v", err)
					return
				}
			}
		}
	}
}

// streamMetrics streams metrics to a WebSocket connection
func (s *Server) streamMetrics(conn *websocket.Conn, query *models.QueryParams) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	// Read control messages from client
	go func() {
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				return // Connection closed or error
			}
		}
	}()

	// Initial query
	metrics, err := s.processor.QueryMetrics(query)
	if err == nil {
		message := WSMessage{
			Type:    "metrics",
			Payload: metrics,
		}
		conn.WriteJSON(message)
	}

	// Send updates
	for {
		select {
		case <-ticker.C:
			// Update since time to get only new metrics
			query.Since = time.Now().Add(-2 * time.Second)
			query.Until = time.Now()

			metrics, err := s.processor.QueryMetrics(query)
			if err != nil {
				log.Printf("Error streaming metrics: %v", err)
				continue
			}

			if len(metrics) > 0 {
				message := WSMessage{
					Type:    "metrics",
					Payload: metrics,
				}
				if err := conn.WriteJSON(message); err != nil {
					log.Printf("Error sending metrics: %v", err)
					return
				}
			}
		}
	}
}

// streamTraces streams traces to a WebSocket connection
func (s *Server) streamTraces(conn *websocket.Conn, query *models.QueryParams) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	// Read control messages from client
	go func() {
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				return // Connection closed or error
			}
		}
	}()

	// Initial query
	traces, err := s.processor.QueryTraces(query)
	if err == nil {
		message := WSMessage{
			Type:    "traces",
			Payload: traces,
		}
		conn.WriteJSON(message)
	}

	// Send updates
	for {
		select {
		case <-ticker.C:
			// Update since time to get only new traces
			query.Since = time.Now().Add(-2 * time.Second)
			query.Until = time.Now()

			traces, err := s.processor.QueryTraces(query)
			if err != nil {
				log.Printf("Error streaming traces: %v", err)
				continue
			}

			if len(traces) > 0 {
				message := WSMessage{
					Type:    "traces",
					Payload: traces,
				}
				if err := conn.WriteJSON(message); err != nil {
					log.Printf("Error sending traces: %v", err)
					return
				}
			}
		}
	}
}
